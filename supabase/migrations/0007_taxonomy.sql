-- Knowra Phase 6.1: the shared Subject → Topic → Concept taxonomy.
--
-- Unlike the per-user tables (quiz_attempts, domain_mastery, flashcards), the
-- taxonomy is a GLOBAL, shared catalog: one set of nodes for all users. Every
-- authenticated user may READ it; only the service-role server may write it
-- (seeding from src/lib/taxonomy/seed.ts and, later, LLM-proposed additions
-- that the app validates first). There are therefore no insert/update/delete
-- policies — RLS denies those to normal users, and the service role bypasses
-- RLS entirely.
--
-- A concept can belong to several topics (and so span subjects) via the
-- concept_topics join table — shared, never duplicated.

create table if not exists public.subjects (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id text primary key,
  subject_id text not null references public.subjects (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists topics_subject_idx on public.topics (subject_id);

create table if not exists public.concepts (
  id text primary key,
  name text not null,
  -- 0..1 weight for 80/20 prioritization (FEATURES.md #7); null until set.
  foundational_weight real check (foundational_weight between 0 and 1),
  created_at timestamptz not null default now()
);

-- Many-to-many: a concept belongs to one or more topics, no duplication.
create table if not exists public.concept_topics (
  concept_id text not null references public.concepts (id) on delete cascade,
  topic_id text not null references public.topics (id) on delete cascade,
  primary key (concept_id, topic_id)
);

create index if not exists concept_topics_topic_idx on public.concept_topics (topic_id);

-- Row Level Security -------------------------------------------------------
-- Read-only to authenticated users; writes are service-role only (no write
-- policies defined, so RLS blocks normal clients from mutating the catalog).

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_topics enable row level security;

create policy "subjects_read_all" on public.subjects
  for select using (true);
create policy "topics_read_all" on public.topics
  for select using (true);
create policy "concepts_read_all" on public.concepts
  for select using (true);
create policy "concept_topics_read_all" on public.concept_topics
  for select using (true);
