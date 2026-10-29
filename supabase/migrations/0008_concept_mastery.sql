-- Knowra Phase 6.2: concept-level mastery.
--
-- Results are tracked at the concept level and aggregated up to topic/subject
-- for dashboards, flashcards and revision. Per-user and RLS-protected like the
-- other profile tables. `concept_id` is plain text (not a FK to the shared
-- `concepts` table) so custom topics, which aren't in the taxonomy, can also
-- record mastery under their own slug.

-- Tag each answer with the concept it tested (nullable for legacy rows).
alter table public.attempt_answers
  add column if not exists concept_id text;

create table if not exists public.concept_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_id text not null,
  mastery real not null default 0 check (mastery between 0 and 1),
  confidence real not null default 0 check (confidence between 0 and 1),
  attempts integer not null default 0,
  correct integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

alter table public.concept_mastery enable row level security;

create policy "concept_mastery_select_own" on public.concept_mastery
  for select using (auth.uid () = user_id);
create policy "concept_mastery_insert_own" on public.concept_mastery
  for insert with check (auth.uid () = user_id);
create policy "concept_mastery_update_own" on public.concept_mastery
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
