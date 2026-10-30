# Knowra

**Learn by testing yourself.** Knowra is a mobile-first PWA that quizzes you across any subject,
finds your weak concepts, and schedules spaced revision so knowledge sticks. It applies three
evidence-informed principles: **active recall**, **80/20 prioritization**, and **spaced
repetition**.

> Hackathon prototype. Kept free-tier where possible; see `docs/ai-log.md` for decisions.

## Stack

- **Next.js 15** (App Router, TypeScript) · **React 19** · **Tailwind v4** · **shadcn/ui**
- **Supabase** (Postgres + Auth + pgvector) with Row Level Security
- **Provider-agnostic LLM** layer — zero-config **mock** by default; set `LLM_PROVIDER=gemini`
  (free Gemini Flash) or `ollama` for a real model
- **Vitest** (unit/integration) + **Playwright** (e2e) · **GitHub Actions** CI · **Vercel** hosting

The deterministic **learning engine** (`src/lib/learning`) owns all scoring, mastery, and
scheduling and is independent of any LLM provider. LLMs only generate content behind the
`LLMProvider` interface (`src/lib/llm/provider.ts`).

Quizzing is **LLM-first**: it generates fresh, personalized questions, and when the model is
unavailable it falls back to a hand-authored **curated question bank** for covered content (or says
so clearly) — it never shows unrelated placeholders.

> 🧭 **New to the codebase?** Start with [docs/architecture.md](docs/architecture.md) — a diagrammed
> tour of the architecture and the key flows.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + LLM keys (never commit .env.local)
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command                             | Purpose                                         |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Dev server (Turbopack)                          |
| `pnpm build` / `pnpm start`         | Production build / serve                        |
| `pnpm lint` · `pnpm typecheck`      | ESLint · `tsc --noEmit`                         |
| `pnpm test` · `pnpm test:e2e`       | Vitest · Playwright                             |
| `pnpm format` · `pnpm format:check` | Prettier                                        |
| `pnpm check`                        | lint + typecheck + test + build (the full gate) |

## Project layout

```
src/app            routes, PWA manifest, server handlers
src/components      app UI (+ ui/ = generated shadcn primitives)
src/lib/learning    deterministic learning engine (no LLM)
src/lib/llm         provider-agnostic LLM abstraction
src/lib/db          Supabase data access
src/types           shared domain types
supabase/migrations versioned SQL + RLS
tests/              unit · integration · e2e
.claude/            agents, hooks, settings (Claude Code setup)
```

## Deployment

Hosted on Vercel via native Git integration: `main` → Production, `dev` and feature branches →
Preview. Full setup and env vars in [docs/deployment.md](docs/deployment.md).

## Documentation

| Doc                                          | What's in it                                     |
| -------------------------------------------- | ------------------------------------------------ |
| [docs/architecture.md](docs/architecture.md) | **Diagrammed** architecture + request/quiz flows |
| [CLAUDE.md](CLAUDE.md)                       | Conventions & golden rules                       |
| [FEATURES.md](FEATURES.md)                   | Feature status by phase                          |
| [docs/design.md](docs/design.md)             | Design language (Linear-adapted)                 |
| [docs/ai-log.md](docs/ai-log.md)             | Decision log (newest first)                      |
| [docs/deployment.md](docs/deployment.md)     | Vercel deploy, env vars, troubleshooting         |
| [improve.md](improve.md)                     | Known tech debt / follow-ups                     |
