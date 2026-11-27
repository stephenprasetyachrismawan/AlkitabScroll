// Friend streaks ("api bareng"), modelled on TikTok/Snapchat message streaks but without
// leagues or rankings: a day counts when BOTH of you sent each other something
// (a message or a verse). The flame stays lit while yesterday counted; while today
// still needs one of you, it shows an hourglass. Computed from the messages table,
// so no extra server state.

/** Local calendar day, same format as algorithm.todayKey (kept here so this file has no imports). */
function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type MsgLite = { sender_id: string; recipient_id: string; created_at: string };

export type FriendStreak = {
  /** consecutive days both sent something; 0 = no streak */
  count: number;
  /** today already counts */
  doneToday: boolean;
  /** I sent something today */
  mineToday: boolean;
  /** they sent something today */
  theirsToday: boolean;
  /** streak alive from yesterday but today is not done yet */
  atRisk: boolean;
};

export const FRIEND_MILESTONES = [3, 7, 30, 100, 365];

function shift(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Per-day senders for one pair: dayKey -> { me, them } */
function daysFor(messages: MsgLite[], me: string, other: string) {
  const days = new Map<string, { me: boolean; them: boolean }>();
  for (const m of messages) {
    const mine = m.sender_id === me && m.recipient_id === other;
    const theirs = m.sender_id === other && m.recipient_id === me;
    if (!mine && !theirs) continue;
    const k = todayKey(new Date(m.created_at));
    const d = days.get(k) ?? { me: false, them: false };
    if (mine) d.me = true;
    else d.them = true;
    days.set(k, d);
  }
  return days;
}

export function friendStreak(messages: MsgLite[], me: string, other: string, now = new Date()): FriendStreak {
  const days = daysFor(messages, me, other);
  const both = (k: string) => {
    const d = days.get(k);
    return !!d && d.me && d.them;
  };
  const t = days.get(todayKey(now));
  const doneToday = both(todayKey(now));
  let count = 0;
  // start from today if it already counts, else from yesterday
  for (let i = doneToday ? 0 : 1; i < 400; i++) {
    if (!both(todayKey(shift(now, -i)))) break;
    count++;
  }
  return {
    count,
    doneToday,
    mineToday: !!t?.me,
    theirsToday: !!t?.them,
    atRisk: count > 0 && !doneToday,
  };
}

/** Streaks with every partner found in `messages`. */
export function allFriendStreaks(messages: MsgLite[], me: string, now = new Date()): Record<string, FriendStreak> {
  const partners = new Set<string>();
  for (const m of messages) partners.add(m.sender_id === me ? m.recipient_id : m.sender_id);
  partners.delete(me);
  const out: Record<string, FriendStreak> = {};
  for (const p of partners) out[p] = friendStreak(messages, me, p, now);
  return out;
}
