import { supabase } from './supabase';
import type { Route, Source } from './algorithm';
import { SOURCE_TTL_HOURS } from './algorithm';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export type Comment = {
  id: number;
  verse_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: Profile;
};

export type Status = {
  id: number;
  user_id: string;
  verse_id: string;
  note: string | null;
  style_variant: number;
  created_at: string;
  expires_at: string;
};

export type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  verse_id: string | null;
  read_at: string | null;
  created_at: string;
};

const PROFILE_COLS = 'id, username, display_name, avatar_url, bio';

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------- Profiles ----------
export async function getProfile(id: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select(PROFILE_COLS).eq('id', id).maybeSingle());
}

export async function getProfiles(ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const rows = check(await supabase.from('profiles').select(PROFILE_COLS).in('id', [...new Set(ids)])) as Profile[];
  return Object.fromEntries(rows.map((p) => [p.id, p]));
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'display_name' | 'username' | 'bio'>>) {
  check(await supabase.from('profiles').update(patch).eq('id', id));
}

export async function searchProfiles(q: string): Promise<Profile[]> {
  const term = q.trim().replace(/[%_,()]/g, '');
  if (!term) return [];
  return check(
    await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(20),
  ) as Profile[];
}

// ---------- Likes & saves ----------
type Kind = 'likes' | 'saves';

export async function myVerseIds(kind: Kind, userId: string): Promise<string[]> {
  const rows = check(
    await supabase.from(kind).select('verse_id').eq('user_id', userId).order('created_at', { ascending: false }),
  ) as { verse_id: string }[];
  return rows.map((r) => r.verse_id);
}

export async function setMark(kind: Kind, userId: string, verseId: string, on: boolean) {
  if (on) check(await supabase.from(kind).upsert({ user_id: userId, verse_id: verseId }));
  else check(await supabase.from(kind).delete().eq('user_id', userId).eq('verse_id', verseId));
}

export async function verseStats(ids: string[]): Promise<Record<string, { likes: number; comments: number }>> {
  if (ids.length === 0) return {};
  const rows = check(await supabase.rpc('verse_stats', { ids })) as {
    verse_id: string;
    like_count: number;
    comment_count: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.verse_id, { likes: Number(r.like_count), comments: Number(r.comment_count) }]));
}

// ---------- Comments ----------
export async function listComments(verseId: string): Promise<Comment[]> {
  const rows = check(
    await supabase.from('comments').select('*').eq('verse_id', verseId).order('created_at', { ascending: false }).limit(200),
  ) as Comment[];
  const profiles = await getProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, profile: profiles[r.user_id] }));
}

export async function addComment(userId: string, verseId: string, body: string) {
  check(await supabase.from('comments').insert({ user_id: userId, verse_id: verseId, body: body.trim() }));
}

export async function deleteComment(id: number) {
  check(await supabase.from('comments').delete().eq('id', id));
}

// ---------- Follows ----------
export async function followCounts(userId: string) {
  const [a, b] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

export async function isFollowing(me: string, other: string) {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', me)
    .eq('following_id', other);
  return (count ?? 0) > 0;
}

export async function setFollow(me: string, other: string, on: boolean) {
  if (on) check(await supabase.from('follows').upsert({ follower_id: me, following_id: other }));
  else check(await supabase.from('follows').delete().eq('follower_id', me).eq('following_id', other));
}

export async function followingIds(me: string): Promise<string[]> {
  const rows = check(await supabase.from('follows').select('following_id').eq('follower_id', me)) as {
    following_id: string;
  }[];
  return rows.map((r) => r.following_id);
}

// ---------- Safety ----------
export async function report(me: string, targetType: 'comment' | 'user' | 'message' | 'status', targetId: string, reason = '') {
  check(await supabase.from('reports').insert({ reporter_id: me, target_type: targetType, target_id: targetId, reason }));
}

export async function setBlock(me: string, other: string, on: boolean) {
  if (on) {
    check(await supabase.from('blocks').upsert({ blocker_id: me, blocked_id: other }));
    await supabase.from('follows').delete().eq('follower_id', me).eq('following_id', other);
  } else {
    check(await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', other));
  }
}

export async function isBlocked(me: string, other: string) {
  const { count } = await supabase
    .from('blocks')
    .select('*', { count: 'exact', head: true })
    .eq('blocker_id', me)
    .eq('blocked_id', other);
  return (count ?? 0) > 0;
}

export async function deleteMyAccount() {
  check(await supabase.rpc('delete_my_account'));
  await supabase.auth.signOut();
}

// ---------- Mood & routes ----------
export async function getMood(userId: string, day: string): Promise<string | null> {
  const row = check(await supabase.from('moods').select('mood').eq('user_id', userId).eq('day', day).maybeSingle()) as {
    mood: string;
  } | null;
  return row?.mood ?? null;
}

export async function setMood(userId: string, day: string, mood: string) {
  check(await supabase.from('moods').upsert({ user_id: userId, day, mood }));
}

export async function moodHistory(userId: string, limit = 30): Promise<{ day: string; mood: string }[]> {
  return check(
    await supabase.from('moods').select('day, mood').eq('user_id', userId).order('day', { ascending: false }).limit(limit),
  ) as { day: string; mood: string }[];
}

export async function loadRoutes(userId: string): Promise<Route[]> {
  const rows = check(
    await supabase.from('algo_routes').select('*').eq('user_id', userId).gt('expires_at', new Date().toISOString()),
  ) as { source: Source; category: string; strength: number; ttl_hours: number; expires_at: string }[];
  return rows.map((r) => ({
    source: r.source,
    category: r.category,
    strength: r.strength,
    ttlHours: r.ttl_hours,
    expiresAt: new Date(r.expires_at).getTime(),
  }));
}

export async function bumpRoute(source: Source, category: string, amount: number) {
  const { error } = await supabase.rpc('bump_route', {
    p_source: source,
    p_category: category,
    p_amount: amount,
    p_ttl_hours: SOURCE_TTL_HOURS[source],
  });
  if (error) console.warn('bump_route', error.message);
}

// ---------- Statuses ----------
export async function postStatus(userId: string, verseId: string, note: string, styleVariant: number) {
  check(await supabase.from('statuses').insert({ user_id: userId, verse_id: verseId, note, style_variant: styleVariant }));
}

/** Active statuses from me + people I follow (RLS hides the rest). */
export async function activeStatuses(): Promise<Status[]> {
  return check(
    await supabase
      .from('statuses')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true }),
  ) as Status[];
}

export async function markStatusViewed(statusId: number, me: string) {
  await supabase.from('status_views').upsert({ status_id: statusId, viewer_id: me });
}

export async function deleteStatus(id: number) {
  check(await supabase.from('statuses').delete().eq('id', id));
}

// ---------- Messages ----------
export type InboxRow = {
  partner_id: string;
  last_body: string | null;
  last_verse_id: string | null;
  last_at: string;
  unread: number;
  profile?: Profile;
};

export async function inbox(): Promise<InboxRow[]> {
  const rows = check(await supabase.rpc('inbox')) as InboxRow[];
  const profiles = await getProfiles(rows.map((r) => r.partner_id));
  return rows.map((r) => ({ ...r, unread: Number(r.unread), profile: profiles[r.partner_id] }));
}

export async function conversation(me: string, other: string): Promise<Message[]> {
  return check(
    await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(500),
  ) as Message[];
}

export async function sendMessage(me: string, to: string, body: string, verseId?: string) {
  check(await supabase.from('messages').insert({ sender_id: me, recipient_id: to, body: body.trim(), verse_id: verseId ?? null }));
}

export async function markRead(me: string, other: string) {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', me)
    .eq('sender_id', other)
    .is('read_at', null);
}
