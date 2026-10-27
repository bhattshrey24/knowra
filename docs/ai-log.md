# AI Implementation Log

Significant decisions, completed phases, open issues, and the next recommended action.
Newest first.

---

## 2026-10-27 — Phase 1: Core quiz loop

**Completed** (branch `feat/phase-1-quiz-loop`, test-first)

- **LLM layer:** `MockLLMProvider` (deterministic, free default), `GeminiProvider` (REST +
  structured JSON output, injectable `fetch` so its parse/validate path is unit-tested without a
  key), and `getLLMProvider()` which falls back to mock when no key is set.
- **Untrusted output validation:** `parseLlmMcqs` (zod) rejects malformed/hallucinated model
  output before it is stored or rendered. `toGeneratedQuestion` attaches system-owned fields.
- **Deterministic engine:** `scoreQuiz` / `isAnswerCorrect` (set-equality, no partial credit).
- **API:** `POST /api/quiz` — zod-validated body, in-memory rate limiting, mock provider by
  default; returns generated MCQs with server-assigned ids.
- **UI:** `QuizSession` drives difficulty 1–5 → fetch → one-question-at-a-time MCQ → score +
  per-question feedback. Replaced the Phase 0 placeholder.
- **Verified:** 26 unit/integration tests + 4 e2e (full quiz loop, difficulty selection) pass;
  lint, typecheck, build green.

**Decisions**

- Provider returns `GeneratedQuestion`/`GeneratedFlashcard` (no `id`/`conceptId`) — identifiers are
  the DB layer's job. Gemini flashcards/written-grading throw "Phase 2" until implemented.
- **Known limitation:** scoring is client-side (correct indices are in the API payload). Fine for
  the mock MVP; move server-side once attempts persist. Tracked in `improve.md`.

**Next recommended action**

- Open PR, confirm CI green, merge. Then Phase 2 (concept taxonomy, mastery, weakness → flashcards,
  knowledge profile) — which is where Supabase persistence gets wired in.

---

## 2026-10-27 — Phase 0: Foundation

**Completed**

- Scaffolded Next.js 15.5 (App Router, `src/`, TS strict) + Tailwind v4 + shadcn/ui via pnpm.
- Adapted the design to the **Linear** reference (chosen from VoltAgent/awesome-design-md):
  indigo primary `oklch(0.52 0.22 277)`, tight 0.5rem radius, neutral surfaces, chart palette.
  Details in `docs/design.md`.
- Built the app shell: landing page, `/home` (domain grid + client search), `/quiz/[domain]`
  (difficulty 1–5 picker), `/dashboard` and `/flashcards` empty states. Mobile-first, accessible.
- Established architecture seams **before** features: `src/types/learning.ts` (domain model),
  `src/lib/llm/provider.ts` (provider-agnostic `LLMProvider` interface), `src/lib/domains.ts`
  (single source of truth for predefined domains).
- PWA baseline: `manifest.ts`, `/icon.svg`, theme-color, network-first service worker (prod only).
- Test harness: Vitest (3 unit tests) + Playwright (2 e2e smoke tests). **All green**, plus lint,
  typecheck, and production build.

**Key decisions**

- **shadcn uses the new "base-nova" style (Base UI, not Radix).** Compose polymorphic components
  with the **`render` prop**, not `asChild`. Class merging via the `cn` package.
- **Vitest pinned to v3 and jsdom to v26.** Vitest 5 / jsdom 30 pull `undici@8`, which crashes on
  this Node 20.20 runtime (`decompress.js` bind error). v3/v26 use the working undici 7.
- **Default LLM = free Gemini Flash** (no budget); provider abstraction lets users bring their own
  Anthropic/OpenAI key later. Hosting = Vercel Hobby (demo). Workflow = full multi-agent.
- Dropped Supabase Cron/Queues from MVP (compute "due" items on read); pgvector deferred to Phase 5.

**Open issues / blocked**

- Supabase cloud project, Vercel deployment, and GitHub remote + branch protection all require the
  user's login. The initial migration (`supabase/migrations/0001_init.sql`) is written but not yet
  applied. CI workflow is written but unproven until pushed.

**Next recommended action**

- With the user: create the GitHub remote, push, and enable branch protection + required checks;
  create the Supabase project and apply the baseline migration; connect Vercel. Then begin
  **Phase 1** (core quiz loop) with the test-first multi-agent workflow.
