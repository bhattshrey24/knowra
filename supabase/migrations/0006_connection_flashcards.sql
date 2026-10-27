-- Knowra Phase 5A: allow cross-domain "connection" flashcards (#10).
-- Widens the flashcards.type check constraint to include 'connection'.

alter table public.flashcards drop constraint if exists flashcards_type_check;

alter table public.flashcards
  add constraint flashcards_type_check
  check (type in ('weakness', 'foundational', 'connection'));
