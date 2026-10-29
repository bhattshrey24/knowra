-- Knowra Phase 6.2: tag revision flashcards with the concept they revise.
-- Nullable (legacy cards and cross-domain connection cards have no single
-- concept), plain text like attempt_answers.concept_id.

alter table public.flashcards
  add column if not exists concept_id text;

create index if not exists flashcards_user_concept_idx
  on public.flashcards (user_id, concept_id);
