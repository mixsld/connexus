-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  full_name                   text not null,
  college                     text not null,
  program                     text not null,
  year_level                  integer not null check (year_level between 1 and 5),
  skill_tags                  text[] not null default '{}',
  interest_tags               text[] not null default '{}',
  project_needs               jsonb not null default '[]',
  availability_hours_per_week integer not null check (availability_hours_per_week >= 0),
  is_active                   boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint profiles_user_id_unique unique (user_id)
);

-- Trigger function: auto-update updated_at on row update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Validation trigger: project_needs must have 'role' key in each element (if any)
create or replace function public.check_project_needs_roles()
returns trigger language plpgsql as $$
begin
  if jsonb_array_length(new.project_needs) > 0 then
    if (
      select bool_and(elem ? 'role')
      from jsonb_array_elements(new.project_needs) as elem
    ) is not true then
      raise exception 'Each element in project_needs must contain a "role" key';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_project_needs_roles
  before insert or update on public.profiles
  for each row execute function public.check_project_needs_roles();

-- ─── weights ─────────────────────────────────────────────────────────────────
create table public.weights (
  id                   uuid primary key default gen_random_uuid(),
  course_weight        numeric(5,4) not null check (course_weight >= 0),
  skills_weight        numeric(5,4) not null check (skills_weight >= 0),
  interests_weight     numeric(5,4) not null check (interests_weight >= 0),
  project_needs_weight numeric(5,4) not null check (project_needs_weight >= 0),
  is_active            boolean not null default false,
  created_at           timestamptz not null default now(),
  constraint weights_sum_to_one check (
    abs(course_weight + skills_weight + interests_weight + project_needs_weight - 1.0) <= 0.001
  )
);

-- Partial unique index: only one active weights row at a time
create unique index weights_single_active
  on public.weights (is_active)
  where is_active = true;

-- Seed the default active weights row
insert into public.weights (course_weight, skills_weight, interests_weight, project_needs_weight, is_active)
values (0.3, 0.3, 0.2, 0.2, true);

-- ─── match_requests ──────────────────────────────────────────────────────────
create table public.match_requests (
  id              uuid primary key default gen_random_uuid(),
  requester_id    uuid not null references public.profiles(id) on delete cascade,
  filters         jsonb not null default '{}',
  result_count    integer not null,
  executed_at     timestamptz not null,
  weight_snapshot jsonb not null
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.weights       enable row level security;
alter table public.match_requests enable row level security;

-- profiles: users can read all active profiles; only own profile is writable
create policy "profiles_select_active" on public.profiles
  for select using (is_active = true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- weights: readable by authenticated users; writable only by service role
create policy "weights_select_authenticated" on public.weights
  for select using (auth.role() = 'authenticated');

-- match_requests: users can read/insert/update/delete their own records
create policy "match_requests_own" on public.match_requests
  for all using (
    requester_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  );