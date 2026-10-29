-- Knowra migration 0011: allow authenticated users to update their own flashcards
-- Required for spaced repetition review updates (reps, ease, interval_days, due_at).

create policy "flashcards_update_own" on public.flashcards
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

