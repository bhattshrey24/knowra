-- Knowra baseline migration: user profiles with Row Level Security.
-- The full concept taxonomy, questions, attempts, mastery, and flashcards
-- tables are added in Phase 1–2 migrations. This establishes the RLS pattern
-- every user-scoped table must follow.

-- One row per authenticated user. The learning engine reads/writes a user's
-- own data only; cross-user access is impossible under the policies below.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- Per-user, non-secret preferences (e.g. preferred difficulty, theme).
  -- User-supplied LLM API keys are NOT stored here in plaintext; see ai-log.md.
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Least privilege: a user may only see and change their own profile row.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid () = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid () = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid () = id)
  with check (auth.uid () = id);

-- Auto-provision a profile when a new auth user is created.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user ();
