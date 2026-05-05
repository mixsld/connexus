-- ─── Connexus Projects Schema ────────────────────────────────────────────────
-- Migration: public.projects table + RLS policies

-- ─── projects ─────────────────────────────────────────────────────────────────
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 120),
  description      text not null check (char_length(description) between 10 and 2000),
  required_skills  text[] not null default '{}',
  required_roles   jsonb not null default '[]',
  status           text not null default 'open'
                     check (status in ('open', 'closed', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Validation trigger: required_roles must have 'role' key in each element (if any)
create or replace function public.check_project_roles()
returns trigger language plpgsql as $$
begin
  if jsonb_array_length(new.required_roles) > 0 then
    if (
      select bool_and(elem ? 'role')
      from jsonb_array_elements(new.required_roles) as elem
    ) is not true then
      raise exception 'Each element in required_roles must contain a "role" key';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_project_roles
  before insert or update on public.projects
  for each row execute function public.check_project_roles();

-- Auto-update updated_at on row change (reuses the trigger function from migration 1)
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Indexes for common queries
create index projects_owner_idx  on public.projects (owner_id);
create index projects_status_idx on public.projects (status);
create index projects_created_idx on public.projects (created_at desc);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.projects enable row level security;

-- Anyone authenticated can read open projects
create policy "projects_select_open" on public.projects
  for select using (
    status = 'open' and auth.role() = 'authenticated'
  );

-- Owners can read their own projects regardless of status
create policy "projects_select_own" on public.projects
  for select using (
    owner_id = public.my_profile_id()
  );

-- Only the owner can insert (owner_id must equal their profile id)
create policy "projects_insert_own" on public.projects
  for insert with check (
    owner_id = public.my_profile_id()
  );

-- Only the owner can update their project
create policy "projects_update_own" on public.projects
  for update using (
    owner_id = public.my_profile_id()
  );

-- Only the owner can delete their project
create policy "projects_delete_own" on public.projects
  for delete using (
    owner_id = public.my_profile_id()
  );