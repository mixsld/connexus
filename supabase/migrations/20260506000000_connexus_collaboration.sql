-- ─── Connexus Collaboration Schema ───────────────────────────────────────────
-- Migration: matches, conversations, messages tables + RLS + Realtime

-- ─── matches ─────────────────────────────────────────────────────────────────
-- Records a directed interest expression from one profile to another.
-- A "confirmed" connection exists when both (A→B) and (B→A) rows have
-- status = 'interested'.
--
-- status values:
--   'pending'      — sender expressed interest, awaiting the other side
--   'interested'   — this side has expressed interest
--   'declined'     — this side declined (soft, not shown to other party)

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'interested'
                 check (status in ('interested', 'declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Each (sender, receiver) pair is unique — no duplicate interest expressions
  constraint matches_sender_receiver_unique unique (sender_id, receiver_id),
  -- A profile cannot express interest in itself
  constraint matches_no_self_match check (sender_id <> receiver_id)
);

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Index for fast lookup of all matches involving a profile
create index matches_sender_idx   on public.matches (sender_id);
create index matches_receiver_idx on public.matches (receiver_id);

-- ─── conversations ────────────────────────────────────────────────────────────
-- One conversation per confirmed mutual match.
-- profile_a_id < profile_b_id (UUID lexicographic order) enforces uniqueness
-- so there is never a duplicate conversation for the same pair.

create table public.conversations (
  id           uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.profiles(id) on delete cascade,
  profile_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),

  -- Canonical ordering: a < b prevents (A,B) and (B,A) duplicates
  constraint conversations_pair_unique unique (profile_a_id, profile_b_id),
  constraint conversations_ordered     check (profile_a_id < profile_b_id),
  constraint conversations_no_self     check (profile_a_id <> profile_b_id)
);

create index conversations_a_idx on public.conversations (profile_a_id);
create index conversations_b_idx on public.conversations (profile_b_id);

-- ─── messages ────────────────────────────────────────────────────────────────
-- Chat messages within a conversation.
-- Subscribed via Supabase Realtime (postgres_changes on INSERT).

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

-- Index for paginated message fetch (newest first)
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.matches       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Helper: resolve the profile id for the current authenticated user
create or replace function public.my_profile_id()
returns uuid language sql stable security definer as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- matches: users can see and manage rows where they are sender or receiver
create policy "matches_select_own" on public.matches
  for select using (
    sender_id   = public.my_profile_id() or
    receiver_id = public.my_profile_id()
  );

create policy "matches_insert_own" on public.matches
  for insert with check (
    sender_id = public.my_profile_id()
  );

create policy "matches_update_own" on public.matches
  for update using (
    sender_id = public.my_profile_id()
  );

-- conversations: visible to both participants
create policy "conversations_select_participants" on public.conversations
  for select using (
    profile_a_id = public.my_profile_id() or
    profile_b_id = public.my_profile_id()
  );

-- conversations are created by a trigger (service role), not directly by users.
-- Allow insert so the client can create the conversation on mutual match.
create policy "conversations_insert_participants" on public.conversations
  for insert with check (
    profile_a_id = public.my_profile_id() or
    profile_b_id = public.my_profile_id()
  );

-- messages: visible only to conversation participants
create policy "messages_select_participants" on public.messages
  for select using (
    conversation_id in (
      select id from public.conversations
      where profile_a_id = public.my_profile_id()
         or profile_b_id = public.my_profile_id()
    )
  );

create policy "messages_insert_participants" on public.messages
  for insert with check (
    sender_id = public.my_profile_id() and
    conversation_id in (
      select id from public.conversations
      where profile_a_id = public.my_profile_id()
         or profile_b_id = public.my_profile_id()
    )
  );

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable Realtime publication for messages (INSERT events only).
-- Run in Supabase dashboard or via CLI if supabase_realtime publication exists.
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.matches;
