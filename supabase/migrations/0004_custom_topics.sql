-- Knowra Phase 4B: user-created custom topics (FEATURES.md #2).
-- A custom topic behaves like a domain: attempts, mastery, and flashcards are
-- keyed by its slug, so progress rolls up the same way. Slugs are prefixed
-- `t-` (see src/lib/learnable.ts) so they never collide with predefined domains.

create table if not exists public.custom_topics (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.custom_topics enable row level security;

create policy "custom_topics_select_own" on public.custom_topics
  for select using (auth.uid () = user_id);
create policy "custom_topics_insert_own" on public.custom_topics
  for insert with check (auth.uid () = user_id);
