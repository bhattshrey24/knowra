-- Knowra Phase 3: SM-2 spaced-repetition scheduling on flashcards.
-- New cards are due immediately (due_at defaults to now()), so a learner can
-- review them right away; subsequent reviews push due_at out per SM-2.

alter table public.flashcards
  add column if not exists reps integer not null default 0,
  add column if not exists ease real not null default 2.5,
  add column if not exists interval_days integer not null default 0,
  add column if not exists due_at timestamptz not null default now(),
  add column if not exists last_reviewed_at timestamptz;

-- Fast "what's due for this user" lookups.
create index if not exists flashcards_due_idx on public.flashcards (user_id, due_at);
