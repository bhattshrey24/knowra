-- Knowra Phase 2: quiz attempts, per-answer records, domain mastery, flashcards.
-- Every table is user-scoped with Row Level Security: a user can touch only
-- their own rows (auth.uid() = user_id). The service-role client bypasses RLS
-- for trusted server operations.

-- A completed quiz attempt (summary).
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_slug text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  total smallint not null check (total >= 0),
  correct smallint not null check (correct >= 0),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at desc);

-- One row per answered question within an attempt.
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid (),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  selected_indices smallint[] not null default '{}',
  correct_indices smallint[] not null default '{}',
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists attempt_answers_attempt_idx
  on public.attempt_answers (attempt_id);

-- Per-user, per-domain mastery (the knowledge profile, FEATURES.md #8).
create table if not exists public.domain_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_slug text not null,
  mastery real not null default 0 check (mastery between 0 and 1),
  confidence real not null default 0 check (confidence between 0 and 1),
  attempts integer not null default 0,
  correct integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain_slug)
);

-- Revision flashcards, weakness vs foundational (FEATURES.md #4).
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain_slug text not null,
  type text not null check (type in ('weakness', 'foundational')),
  front text not null,
  back text not null,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_user_type_idx
  on public.flashcards (user_id, type);

-- Row Level Security -------------------------------------------------------

alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.domain_mastery enable row level security;
alter table public.flashcards enable row level security;

-- quiz_attempts
create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select using (auth.uid () = user_id);
create policy "quiz_attempts_insert_own" on public.quiz_attempts
  for insert with check (auth.uid () = user_id);

-- attempt_answers
create policy "attempt_answers_select_own" on public.attempt_answers
  for select using (auth.uid () = user_id);
create policy "attempt_answers_insert_own" on public.attempt_answers
  for insert with check (auth.uid () = user_id);

-- domain_mastery
create policy "domain_mastery_select_own" on public.domain_mastery
  for select using (auth.uid () = user_id);
create policy "domain_mastery_insert_own" on public.domain_mastery
  for insert with check (auth.uid () = user_id);
create policy "domain_mastery_update_own" on public.domain_mastery
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

-- flashcards
create policy "flashcards_select_own" on public.flashcards
  for select using (auth.uid () = user_id);
create policy "flashcards_insert_own" on public.flashcards
  for insert with check (auth.uid () = user_id);
create policy "flashcards_delete_own" on public.flashcards
  for delete using (auth.uid () = user_id);
