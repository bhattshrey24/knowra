# AI Implementation Log

Significant decisions, completed phases, open issues, and the next recommended action.
Newest first.

---

## 2026-10-27 — Phase 2C: flashcards

**Completed** — Deterministic `buildFlashcardsFromQuiz` (unit-tested): wrong answers → **weakness**
cards, a capped number of correct answers → **foundational** cards, each with the correct option
text + explanation on the back. `/api/attempts` now generates and de-duplicates cards per
user+domain on quiz finish. Flashcards page renders them in two distinct, tap-to-reveal sections.

**Verified live (2A+2B)**: user took 3 quizzes → 3 attempts, 15 answers, 2 domain-mastery rows
persisted; dashboard profile populated. Flashcards awaiting one more quiz post-2C to populate.

**Next**: Phase 3 (spaced repetition / SM-2, retention, richer analytics).

---

## 2026-10-27 — Phase 2 (2A+2B): persistence + knowledge profile

**Completed** (branch `feat/phase-2-supabase`)

- **Supabase connected** (hosted free project). Client scaffolding: browser/server/admin clients +
  session middleware. supabase-js needs a native WebSocket (Node 22+); supplied `ws` as the
  realtime transport so it runs on Node 20 too (see improve.md).
- **Migrations:** `0001` (profiles) applied; `0002` (quiz_attempts, attempt_answers,
  domain_mastery, flashcards) written — RLS on every table, user-scoped to `auth.uid()`.
- **Mastery engine** (`mastery.ts`): deterministic, LLM-independent, unit-tested (correct answers
  raise mastery more when harder; wrong lowers more when easier; confidence grows with attempts).
- **Anonymous auth**: silent anon sign-in on first load (no login wall); everything gates on
  `isSupabaseConfigured()` so the app still runs stateless on the mock provider / in CI.
- **Persistence**: `POST /api/attempts` recomputes correctness server-side, stores the attempt +
  answers, and folds outcomes into `domain_mastery`. Quiz finish calls it fire-and-forget.
- **Dashboard**: server component renders the real per-domain knowledge profile (X/10 + accuracy).
- **Verified offline**: 33 unit/integration tests, build, and 4 e2e (run in mock mode so no writes
  to the real DB) all green.

**Decisions**

- Factory now ignores placeholder keys (`your-gemini-key`/empty) → copied `.env.example` safely
  falls back to mock. `.env.example` default `LLM_PROVIDER=mock`.
- Scoring/mastery are server-authoritative in `/api/attempts`, but the answer key still comes from
  the client payload (documented limitation; full server-side quiz state is a later hardening).

**Blocked on user**

- Apply `supabase/migrations/0002_learning.sql`; enable **Anonymous sign-ins** in the Supabase
  dashboard. Then verify with `node --env-file=.env.local scripts/check-learning.mjs` + a live quiz.

**Next**

- Phase 2C: generate weakness + foundational flashcards (#4) from results, wire the flashcards page.

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
