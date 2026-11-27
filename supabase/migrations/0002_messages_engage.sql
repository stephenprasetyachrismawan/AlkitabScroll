-- Messages, more alive: prayer requests, replies, reactions.
-- Run once in the Supabase SQL Editor after 0001_init.sql. Safe to re-run.

-- ---------- Message kinds and replies ----------
alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'verse', 'prayer'));
alter table public.messages add column if not exists reply_to bigint references public.messages on delete set null;

-- ---------- Reactions ----------
-- One row per person per message per emoji. 🙏 on a prayer request means "I prayed for this".
create table if not exists public.message_reactions (
  message_id bigint not null references public.messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Only the two people in the conversation can see or add reactions.
create or replace function public.is_message_participant(mid bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m
    where m.id = mid and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  );
$$;

drop policy if exists "reactions read" on public.message_reactions;
create policy "reactions read" on public.message_reactions for select
  using (public.is_message_participant(message_id));
drop policy if exists "reactions insert own" on public.message_reactions;
create policy "reactions insert own" on public.message_reactions for insert
  with check (auth.uid() = user_id and public.is_message_participant(message_id));
drop policy if exists "reactions delete own" on public.message_reactions;
create policy "reactions delete own" on public.message_reactions for delete
  using (auth.uid() = user_id);

grant select on public.message_reactions to authenticated;
grant insert, delete on public.message_reactions to authenticated;

-- Not added to supabase_realtime on purpose: Postgres delete events skip RLS, so the app
-- pings the other person over the conversation's broadcast channel and they refetch instead.

-- ---------- Inbox carries the last message's kind ----------
drop function if exists public.inbox();
create function public.inbox()
returns table (partner_id uuid, last_body text, last_verse_id text, last_kind text, last_mine boolean, last_at timestamptz, unread bigint)
language sql stable set search_path = public as $$
  with mine as (
    select *, case when sender_id = auth.uid() then recipient_id else sender_id end as partner
    from messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ), ranked as (
    select *, row_number() over (partition by partner order by created_at desc) rn from mine
  )
  select r.partner, r.body, r.verse_id, r.kind, r.sender_id = auth.uid(), r.created_at,
    (select count(*) from mine m where m.partner = r.partner and m.recipient_id = auth.uid() and m.read_at is null)
  from ranked r where rn = 1
  order by r.created_at desc;
$$;
