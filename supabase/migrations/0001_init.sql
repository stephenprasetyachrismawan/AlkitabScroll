-- Selah database schema.
-- Run in Supabase SQL Editor (or `supabase db push`).
-- Verse text ships inside the app (data/verses.json); the database only stores verse ids.

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  display_name text not null default 'Sahabat Selah',
  avatar_url text,
  bio text default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Sahabat Selah'),
    new.raw_user_meta_data->>'avatar_url',
    'user' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Engagement ----------
create table public.likes (
  user_id uuid not null references public.profiles on delete cascade,
  verse_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, verse_id)
);
create index likes_verse_idx on public.likes (verse_id);

create table public.saves (
  user_id uuid not null references public.profiles on delete cascade,
  verse_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, verse_id)
);

create table public.comments (
  id bigint generated always as identity primary key,
  verse_id text not null,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_verse_idx on public.comments (verse_id, created_at desc);

-- ---------- Social graph ----------
create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('comment', 'user', 'message', 'status')),
  target_id text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Mood & algorithm ----------
create table public.moods (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  mood text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- One row per (source, category): the "route stack".
-- strength grows with repeated signals; expires_at slides forward on each signal.
create table public.algo_routes (
  user_id uuid not null references public.profiles on delete cascade,
  source text not null check (source in ('mood', 'save', 'like', 'dwell')),
  category text not null,
  strength real not null default 1,
  ttl_hours int not null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, source, category)
);

-- ---------- Status (24h, followers only) ----------
create table public.statuses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  verse_id text not null,
  note text default '' check (char_length(note) <= 200),
  style_variant int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index statuses_user_idx on public.statuses (user_id, expires_at);

create table public.status_views (
  status_id bigint not null references public.statuses on delete cascade,
  viewer_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

-- ---------- Direct messages ----------
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  body text default '' check (char_length(body) <= 2000),
  verse_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body <> '' or verse_id is not null)
);
create index messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_recipient_idx on public.messages (recipient_id, created_at desc);

-- ---------- Helper functions ----------
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Aggregated counts for a batch of verses (likes + comments), for feed rendering.
create or replace function public.verse_stats(ids text[])
returns table (verse_id text, like_count bigint, comment_count bigint)
language sql stable set search_path = public as $$
  select v.id,
    (select count(*) from likes l where l.verse_id = v.id),
    (select count(*) from comments c where c.verse_id = v.id)
  from unnest(ids) as v(id);
$$;

-- Latest message per conversation partner for the inbox.
create or replace function public.inbox()
returns table (partner_id uuid, last_body text, last_verse_id text, last_at timestamptz, unread bigint)
language sql stable set search_path = public as $$
  with mine as (
    select *, case when sender_id = auth.uid() then recipient_id else sender_id end as partner
    from messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ), ranked as (
    select *, row_number() over (partition by partner order by created_at desc) rn from mine
  )
  select r.partner, r.body, r.verse_id, r.created_at,
    (select count(*) from mine m where m.partner = r.partner and m.recipient_id = auth.uid() and m.read_at is null)
  from ranked r where rn = 1
  order by r.created_at desc;
$$;

-- Signal from the app: like / save / dwell / mood bumps a route.
create or replace function public.bump_route(p_source text, p_category text, p_amount real, p_ttl_hours int)
returns void language sql security invoker set search_path = public as $$
  insert into algo_routes (user_id, source, category, strength, ttl_hours, updated_at, expires_at)
  values (auth.uid(), p_source, p_category, p_amount, p_ttl_hours, now(), now() + make_interval(hours => p_ttl_hours))
  on conflict (user_id, source, category) do update set
    -- old strength fades before the new signal is added, so routes never grow stale
    strength = least(10, case when algo_routes.expires_at < now() then 0
                              else algo_routes.strength * greatest(0, extract(epoch from (algo_routes.expires_at - now())) / (algo_routes.ttl_hours * 3600.0)) end
                         + excluded.strength),
    ttl_hours = excluded.ttl_hours,
    updated_at = now(),
    expires_at = excluded.expires_at;
$$;

-- Account deletion (required by Play Store for apps with accounts).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moods enable row level security;
alter table public.algo_routes enable row level security;
alter table public.statuses enable row level security;
alter table public.status_views enable row level security;
alter table public.messages enable row level security;

-- Profiles: public read, owner update.
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Likes: public read (counts, profile tab), own write.
create policy "likes read" on public.likes for select using (true);
create policy "likes insert own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes delete own" on public.likes for delete using (auth.uid() = user_id);

-- Saves: public read (profiles are public), own write.
create policy "saves read" on public.saves for select using (true);
create policy "saves insert own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves delete own" on public.saves for delete using (auth.uid() = user_id);

-- Comments: public read except from blocked users, own write/delete.
create policy "comments read" on public.comments for select
  using (auth.uid() is null or not public.is_blocked_between(auth.uid(), user_id));
create policy "comments insert own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments delete own" on public.comments for delete using (auth.uid() = user_id);

-- Follows: public read, own write.
create policy "follows read" on public.follows for select using (true);
create policy "follows insert own" on public.follows for insert
  with check (auth.uid() = follower_id and not public.is_blocked_between(follower_id, following_id));
create policy "follows delete own" on public.follows for delete using (auth.uid() = follower_id);

-- Blocks & reports: own only.
create policy "blocks own" on public.blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "reports insert own" on public.reports for insert with check (auth.uid() = reporter_id);

-- Moods & routes: private to owner.
create policy "moods own" on public.moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routes own" on public.algo_routes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Statuses: owner, or followers of the owner, while not expired.
create policy "statuses read" on public.statuses for select using (
  auth.uid() = user_id
  or (expires_at > now()
      and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = statuses.user_id)
      and not public.is_blocked_between(auth.uid(), user_id))
);
create policy "statuses insert own" on public.statuses for insert with check (auth.uid() = user_id);
create policy "statuses delete own" on public.statuses for delete using (auth.uid() = user_id);

create policy "status views insert own" on public.status_views for insert with check (auth.uid() = viewer_id);
create policy "status views read" on public.status_views for select using (
  auth.uid() = viewer_id
  or exists (select 1 from public.statuses s where s.id = status_id and s.user_id = auth.uid())
);

-- Messages: only the two participants; no messaging across blocks.
create policy "messages read" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages insert" on public.messages for insert
  with check (auth.uid() = sender_id and not public.is_blocked_between(sender_id, recipient_id));
create policy "messages mark read" on public.messages for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
-- Recipients may only flip read_at, never edit message text.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Realtime for chat.
alter publication supabase_realtime add table public.messages;
