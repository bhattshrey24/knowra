# Supabase

Versioned SQL migrations for Knowra's Postgres database. Every user-scoped table **must** enable
Row Level Security and restrict access to `auth.uid() = <owner column>` (see `0001_init.sql`).

## Status

The hosted Supabase project is **not yet created** — it needs the project owner's login. Once
created:

1. Install the CLI (as a dev dependency or standalone binary).
2. `supabase link --project-ref <ref>` and set secrets locally in `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. `supabase db push` to apply migrations.

## Free-tier notes

- 500 MB database, 2 projects per org, **pauses after 7 days of inactivity** (restore from the
  dashboard before a demo). pgvector is available and is introduced in Phase 5.
- Never use production data/credentials in tests. Use a separate test project or local stack.
