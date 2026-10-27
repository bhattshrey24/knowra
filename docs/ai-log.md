# AI Implementation Log

Significant decisions, completed phases, open issues, and the next recommended action.
Newest first.

---

## 2026-10-27 — Deployment setup (Vercel)

Added a `dev` branch alongside `main`. **`main` is the production branch** (user's model); `dev`
and feature branches deploy as Vercel Previews. CI runs on `main` + `dev` + PRs to them. Wrote
`docs/deployment.md`: Vercel native Git integration with Production Branch = `main`, env-var
checklist, Supabase site-URL + free-tier-pause + Hobby/non-commercial notes. **Vercel connection is
the user's to do in the dashboard**; no deploy job in GitHub Actions. (An earlier extra `prod`
branch was a mistake and was deleted; docs corrected here.)

---

## 2026-10-27 — Phase 4E: focus areas + gap hints (#7, #12) — Phase 4 complete

**Completed** (branch `feat/phase-4e-focus`, test-first) — `focus.ts` (unit-tested): `focusAreas`
ranks the weakest _engaged_ subjects (excludes solid/never-attempted) for lightweight 80/20
prioritization; `needsFoundationalWork` flags low mastery with enough attempts. Dashboard gains a
"Focus areas" card (with a Practise link per subject) and a "shore up the basics" hint on
low-mastery subject cards. No migration. Verified: 71 tests + 7 e2e (mock) + build green.
**Honest limitation**: subject-level approximation; true concept/prerequisite prioritization needs
a taxonomy (future work, improve.md). **Phase 4 is complete.**

**Next**: Phase 5 — cross-domain concept connections + RAG/pgvector (#10); then Phase 6 AI
assistant (#5).

---

## 2026-10-27 — Phase 4D: written questions (#11 complete)

**Completed** (branch `feat/phase-4d-written`, test-first) — Free-text questions: `grade-written.ts`
(unit-tested) scores an answer by how many reference keywords it covers (stopwords ignored),
threshold 0.5; `llmWrittenSchema`/`parseLlmWritten`/`toGeneratedWrittenQuestion`; mock + Gemini
generate written; `/api/quiz` format enum adds `written`. Quiz UI: textarea; format-aware scoring
and results (shows your answer + reference). Migration `0005` adds `written_answer`/
`reference_answer` to `attempt_answers`; `/api/attempts` grades written server-side, persists, and
makes flashcards (builder now format-aware). **All three formats (#11) done.** Verified: 66
unit/integration tests + 7 e2e (mock) + build green.

**Blocked on user**: apply `supabase/migrations/0005_written_answers.sql` to persist written attempts.

**Next**: lightweight 80/20 focus (#7) + foundational-gap hints (#12) to close Phase 4.

---

## 2026-10-27 — Phase 4C: multi-select format (#11)

**Completed** (branch `feat/phase-4c-multiselect`, test-first) — Added multiple-select questions:
`llmMultiSchema`/`parseLlmMulti`/`toGeneratedMultiQuestion` (unit-tested; 1+ distinct, in-range
correct indices); mock + Gemini providers branch on the requested format; `/api/quiz` takes a
`format` (mcq|multi). Quiz screen gains a format picker; multi uses a checkbox UI and set-equality
scoring (reuses `isAnswerCorrect`), so it persists + makes flashcards exactly like MCQ — **no
migration**. Verified: 61 unit/integration tests + 6 e2e (mock, incl. multi-select) + build green.

**Next**: 4D written (free-text) format — needs a text-answer column on `attempt_answers` and a
grader (deterministic word-overlap, with LLM `gradeWritten` as an enhancement).

---

## 2026-10-27 — Phase 4B: custom topic search (#2)

**Completed** (branch `feat/phase-4b-custom-topics`, test-first)

- `learnable.ts` (unit-tested): a "learnable" is a predefined domain OR a custom topic; custom
  slugs are kebab-cased and `t-`-prefixed so they never collide with predefined slugs.
- Migration `0004`: `custom_topics` (user_id, slug, title) with RLS.
- `POST /api/topics` finds/creates a user's topic (rate-limited); home search shows a
  "Quiz me on …" CTA when no preset matches (only when a backend is available).
- `resolveLearnable` (server) now backs `/quiz/[domain]`, `/api/quiz`, and `/api/attempts`, so a
  custom topic quizzes, persists, and shows up on the dashboard/flashcards by its title.
- Vitest: stubbed the `server-only` package (Next provides it at build; node tests can't resolve it).
- Verified offline: 56 unit/integration tests + 5 e2e (mock) + build green.

**Blocked on user**: apply `supabase/migrations/0004_custom_topics.sql`, then type any topic on the
home screen → "Quiz me on …".

**Next**: 4C multi-select + written formats (#11); lightweight 80/20 (#7) + foundational-gap (#12).

---

## 2026-10-27 — Phase 4A: difficulty recommendation (#3, #14)

**Completed** (branch `feat/phase-4a-difficulty-reco`, test-first) — Deterministic
`recommendDifficulty(masteryState)` (unit-tested): eases beginners in at level 2, maps mastery to a
1–5 band, and holds back the hardest levels until confidence is established (progressive load).
The quiz screen fetches the user's domain mastery, pre-selects the suggested level, and badges it
"Suggested" — the user always overrides. `/quiz/[domain]` is now dynamic (reads the session).
Verified: 50 unit/integration tests + 5 e2e (mock) + build green. No migration / user action.

**Next**: 4B custom topic search (#2); 4C multi-select + written formats (#11); lightweight 80/20
(#7) + foundational-gap (#12).

---

## 2026-10-27 — Phase 3B: analytics dashboard (#9, #13)

**Completed** (branch `feat/phase-3b-analytics`, test-first)

- Pure analytics module (`analytics.ts`, unit-tested): `overallStats`, `accuracyTimeline`,
  `domainGains` (baseline vs latest accuracy per domain = learning gain / retention signal, #13).
- `AccuracyChart` — inline-SVG line/area, one brand hue (no legend/categorical palette to
  validate), recessive grid, non-scaling strokes, hover crosshair + tooltip, and a `<details>`
  table as the color-independent accessible view (per the dataviz skill).
- Dashboard rebuilt: stat tiles (quizzes/answered/accuracy), accuracy-over-time chart, per-domain
  mastery with baseline→now gain (▲/▼ + label, not color alone). No new migration — reads
  existing `quiz_attempts`.
- Verified offline: 46 unit/integration tests + 5 e2e (mock, incl. dashboard/flashcards empty
  states) + build green.

**Next**: Phase 4 — custom topic search (#2), difficulty recommendation (#3), 80/20 (#7),
foundational-gap detection (#12), progressive load (#14), multi-select + written formats (#11).

---

## 2026-10-27 — Phase 3A: spaced repetition (SM-2)

**Completed** (branch `feat/phase-3-spaced-repetition`, test-first)

- Deterministic **SM-2** engine (`sm2.ts`, unit-tested): classic 1→6→interval×ease progression,
  ease floored at 1.3, lapses reset reps/interval. Grades: again/hard/good/easy → quality 2/3/4/5.
- Migration `0003`: `reps, ease, interval_days, due_at (default now), last_reviewed_at` on
  flashcards + a `(user_id, due_at)` index. New cards are due immediately.
- `POST /api/flashcards/review` recomputes the schedule server-side and updates the card under RLS.
- Flashcards page: "Due for review" session (reveal → rate) that reschedules each card (#6).
- Verified offline: 42 unit/integration tests + 4 e2e (mock) + build green.

**Blocked on user**: apply `supabase/migrations/0003_spaced_repetition.sql`. New cards become due
immediately, so review is demoable right after taking a quiz (no waiting).

**Next**: Phase 3B — analytics dashboard (#9) + baseline/retention (#13), reading existing
`quiz_attempts` (no new migration).

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
