# Knowra — Project Instructions

Knowra is a mobile-first PWA for **active-recall learning**: quiz first, detect weak concepts,
revise with spaced repetition. Judged on Claude Code setup quality and production-quality build.
Keep it effectively **$0**; get approval before any paid resource.

## Golden rules

- **The learning engine and knowledge profile are LLM-independent.** All scoring, mastery
  estimation, difficulty recommendation, prioritization, and spaced-repetition scheduling live in
  `src/lib/learning` as deterministic, unit-tested TypeScript. LLMs only generate content
  (questions, explanations, flashcards, analogies) behind the `LLMProvider` interface
  (`src/lib/llm/provider.ts`).
- **Treat all LLM output and user/external input as untrusted.** Validate with zod before storing
  or rendering. Never trust model JSON shape.
- **Secrets are server-only.** Never expose LLM or Supabase service-role keys to the client. Never
  commit `.env*`. Document env var names in `.env.example` only.
- **Reuse before writing.** Prefer existing utilities, shadcn/ui primitives, and the stdlib over
  new code or new dependencies. Avoid unnecessary abstractions.
- **Keep it working at every step.** `pnpm check` (lint + typecheck + test + build) must pass
  before a task is considered done.

## Stack

- Next.js 15 (App Router, `src/`) · React 19 · TypeScript (strict)
- Tailwind v4 · shadcn/ui ("base-nova" style, Base UI primitives — use the `render` prop, **not**
  `asChild`) · lucide-react icons · `cn` for class merging
- Supabase (Postgres + Auth + pgvector) with RLS on every user table — **cloud project pending**
- LLM: provider-agnostic; default free provider (Gemini Flash); users may connect their own key later
- Tests: Vitest (unit/integration) + Playwright (e2e). Hosting: Vercel Hobby (demo).

## Conventions

- Package manager: **pnpm**. Scripts: `dev build start lint typecheck test test:e2e format check`.
- Path alias `@/*` → `src/*`. Core domain types in `src/types/learning.ts`.
- Server-only code (LLM calls, service-role DB) lives in route handlers / server actions, never in
  client components.
- Prettier formats everything except `src/components/ui` (generated). Run `pnpm format`.
- Commit tests separately from implementation. Mark a FEATURES.md item done only after its
  acceptance criteria are verified.

## Multi-agent workflow

Orchestrator (plan/criteria) → Tester (tests from criteria, before code) → Builder (implements;
must not edit acceptance/e2e tests) → Verifier (independent review vs requirements). Real
enforcement is server-side: branch protection + required CI checks. See `docs/ai-log.md`.

## Where things live

- `src/app` routes · `src/components` app UI · `src/components/ui` shadcn (generated)
- `src/lib/learning` deterministic engine · `src/lib/llm` provider abstraction · `src/lib/db` data
- `supabase/migrations` versioned SQL + RLS · `tests/` unit/integration/e2e
- Docs: `FEATURES.md`, `docs/ai-log.md`, `improve.md`, `docs/design.md`
