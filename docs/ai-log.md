# AI Implementation Log

Significant decisions, completed phases, open issues, and the next recommended action.
Newest first.

---

## 2026-10-30 — Phase 7 (Dashboard v2), Phase 8 (Auth audit & RLS), CI Playwright fixes, LLM generation hardening

Full-stack consolidation session on branch **`feat/ollama-provider`**. All 191 unit/integration tests passing; TypeScript (`tsc --noEmit`), ESLint, and Playwright e2e suites all passing cleanly.

**1. Completed — Phase 7: Dashboard v2 (Concept-First Deep Insights):**
- **Deterministic Analytics Engine (`src/lib/learning/analytics.ts`):** Implemented all calculation pipelines: hierarchy drilldown (`DashboardHierarchy`), stacked mastery distribution (`DistributionBar`), accuracy by difficulty (`DifficultyAccuracyChart`), retention panel with 7-day forecast (`RetentionPanel`), study momentum streak and 4-week GitHub-style activity heatmap (`ActivityHeatmap`), SVG knowledge radar chart (`KnowledgeRadar`), and per-subject accuracy filtering.
- Fully covered by unit tests in `tests/unit/dashboard-v2.test.ts`.

**2. Completed — Phase 8: Authentication Audit, RLS Policies & Backend Hygiene:**
- **SMTP Rate Limit Bypass:** Supabase free tier built-in SMTP limits signups to 4 emails/hour. Implemented server-side registration endpoint `POST /api/auth/register` using the admin client with `email_confirm: true`, auto-confirming users safely without hitting rate limits.
- **OAuth Audit & UI Streamlining:** Diagnosed HTTP 400 (`Unsupported provider: provider is not enabled`) caused by unconfigured OAuth credentials in Supabase dashboard. Per user specification, removed Google OAuth from `/login` and streamlined UI to GitHub OAuth + Email/Password with helpful setup diagnostics.
- **RLS Policy Fix for Flashcards:** Discovered that migration `0002` lacked an `UPDATE` policy on `flashcards`, causing silent review persistence failures under RLS. Created and deployed migration `0011_flashcard_update_policy.sql` (`flashcards_update_own`), accompanied by defensive fallback in `/api/flashcards/review`.
- **Profile Endpoint Safety:** Added defensive fallback for `avatar_url` in `/api/profile` to prevent runtime crashes when running against schemas without migration `0010`.

**3. Completed — Playwright e2e CI Fixes (GitHub Actions):**
- Fixed `tests/e2e/smoke.spec.ts` heading assertion to match Phase 6 homepage copy (`"What will you learn today?"`).
- Fixed `tests/e2e/quiz.spec.ts` to toggle `"Choose yourself"` before attempting to click specific 1–5 level cards, respecting the default adaptive difficulty toggle.
- Configured `expect: { timeout: 15_000 }` in `playwright.config.ts` to accommodate cold Next.js route compilation in CI. GitHub Actions Run ID `40912331276` passed all jobs (1m 17s e2e execution).

**4. Completed — LLM Generation Robustness & Small-Model Inversion Fixes:**
- **Root Cause Analysis:** Discovered that ultra-small local models (`llama3.2:1b` via Ollama) inverted JSON schema fields during MCQ generation—setting `prompt` to `"Multiple Choice Questions on Mathematics"`, cramming the math problem into `options[0]` while echoing internal terms (`"What is the correctIndex..."`), and outputting JSON syntax noise (`options[4] = "],"`).
- **Schema & Prompt Hardening (`src/lib/llm/ollama.ts`):** Enforced `minItems: 4, maxItems: 4` on `options` in `MCQ_SCHEMA` and `MULTI_SCHEMA` to leverage Ollama's GBNF grammar constraints. Added system prompt instructions and strict formatting rules.
- **Defensive Zod Validation (`src/lib/validation/question.ts`):** Added refinements to reject generic titles as prompts (`GENERIC_HEADING_REGEX`), leaked internal fields (`correctIndex`, `Concepts:`), and JSON punctuation artifacts (`],`, `{`, `}`).
- **Graceful Fallback:** If an LLM ever returns corrupt output, the validation rejection triggers the quiz route's built-in practice question fallback (`MockLLMProvider`), ensuring the learner never sees broken questions.
- **Gemini Documentation & Switching:** Documented exact `.env.local` configuration for switching from Ollama to Gemini API (`LLM_PROVIDER="gemini"`, `gemini-flash-lite-latest` vs `gemini-3.8-flash`).

**Current Status:**
- Working tree clean. All unit tests (191/191) and typecheck passing.
- Remote `feat/ollama-provider` is up to date.
- Migrations `0001`–`0011` deployed and verified.

**Exact Next Steps:**
1. Proceed with **MVP Feature #5: AI learning assistant (chatbot)** from `FEATURES.md` — conversational tutor scoped to learner's profile, recent mistakes, and concept mastery.
2. Build chatbot UI and streaming API route using the existing `LLMProvider` abstraction.

---

## 2026-10-29 — Phase 6 (6.1–6.7) + UI redesigns + Ollama reliability

Large multi-feature session on branch **`feat/ollama-provider`** (name now outdated — it holds all
of the below, not just the Ollama provider). `pnpm check` stayed green throughout (≈168–169 unit/
integration tests; test count grew from 80 → 169). Every deterministic engine is unit-tested; all
engine logic is LLM-independent per the golden rules.

**Completed — Phase 6, concept-level taxonomy & adaptive mastery (test-first):**

- **6.1 Hierarchy** — `learning/taxonomy.ts` (validation + `conceptsForScope`); seed catalogue;
  migration `0007` (shared `subjects`/`topics`/`concepts`/`concept_topics`, authenticated read /
  service-role writes); DB loader `db/taxonomy-server.ts` with `getTaxonomy()` (DB catalogue or
  in-memory seed); every question concept-tagged — LLM proposes a label, app validates it
  (`learning/concept-tagging.ts`, round-robin fallback). `POST /api/admin/seed-taxonomy`
  (`SEED_TOKEN`-guarded) loads the seed into the DB.
- **6.2 Concept tracking + balancing** — `learning/aggregate.ts` (`foldConceptMastery`,
  `aggregateByLevel` concept→topic→subject, `weakestConcepts`); migration `0008` (`concept_mastery`
  - `attempt_answers.concept_id`); `/api/attempts` records concept outcomes; balanced subject/topic
    selection (`learning/concept-selection.ts`: weak/unassessed/retention, `MIN_EVIDENCE` gate);
    dashboard gains "By topic" rollups + "Weakest concepts".
- **6.3 Search-create** — LLM `classify` on the provider interface (mock/gemini/ollama, zod-
  validated); `learning/classify.ts` `resolveClassification` (reuse-vs-new, dedup, collision-free
  slugs); `POST /api/classify` (propose) + `POST /api/learn` (save, idempotent upserts);
  `LearnCreate` UI (edit Subject→Topic→Concept, New/Existing badges). `resolveLearnable` now
  resolves taxonomy subjects, so user-added subjects are quizzable.
- **6.4 Seed** — expanded to **24 subjects / ~75 topics / ~215 concepts**, derived from `DOMAINS`
  (single source → every subject quizzable; `seed == DOMAINS` test holds).
- **6.5 Diagnostics** — `learning/diagnostic.ts` (`needsDiagnostic`, `planDiagnostic`, `isUncertain`);
  quiz-start offers a skippable diagnostic; `/api/quiz` `diagnostic` mode probes unassessed
  concepts; dashboard "Uncertain" badges.
- **6.6 Difficulty calibration** — `learning/difficulty.ts` guidelines fed into gen prompts;
  `recommendAdaptiveDifficulty` (mastery band + recent accuracy, progressive-load cap); quiz-start
  **Adaptive by default** with manual 1–5 override.
- **6.7 Learner profile** — flashcard reviews fold retention into concept mastery (`sm2.retentionOutcome`).

**Completed — UI work (earlier in the session):** theme toggle (light/dark/system, anti-flash);
quiz options (format checkbox multi-select → mixed quizzes, 5–30 question slider, countdown timer);
flashcards redesign (due banner, All/Due filter, Subjects/Topics/Concepts browse) and a **unified
flip-and-rate review** (`FlashcardReview`) that replaced the separate `FlashcardStudy` +
`ReviewSession`; **taxonomy homepage** (prominent search + "Try:" + live suggestions, catalogue
tabs with breadcrumbs, Continue-learning from real data).

**Issues encountered + fixes:**

- **Ollama quiz timeouts / dummy (mock) fallback.** Root causes and fixes: (a) a single malformed
  question made the whole batch fail → `parseLlm*` now validate per item and keep the valid ones
  (`validation/question.ts`); (b) cold model reload → send `keep_alive: "10m"`; (c) one oversized
  LLM call exceeded the timeout → generate in **≤6-question sequential chunks** (`generateMix`),
  cap to requested count; raised Ollama per-call timeout 60→90s and client abort 65→150s. Isolated
  timings: ~17s plain / ~31s structured per 6-question Ollama call (trust these — my end-to-end
  timing runs were unreliable; the test machine OOM-killed a server running build+server+ollama at
  once).
- `Map` lucide icon shadowed the global `Map` constructor → aliased to `MapIcon` in
  `lib/subject-icons.ts`.

**Key decisions:** global shared taxonomy (service-role writes); additive/incremental rollout (app
never broke); concept tagging = LLM-proposed label + deterministic app validation, one call per
format (Ollama-friendly) not per concept; AI assistant (#5) deliberately set aside at the user's
request.

**Current state (session close):** working tree has **uncommitted `FEATURES.md`** (added Phase 7
Dashboard-v2 roadmap + refreshed statuses) and **3 unpushed commits** (`3bb15ed`, `5ef55d6`,
`9ea918b` — the quiz reliability fixes). Supabase is **live** (migrations `0001`–`0009` applied,
Anonymous sign-ins on, 2026-10-29). LLM = local **Ollama `llama3.2:1b`** (slow/modest; Gemini key
present for a faster option).

**Exact next steps:**

1. **Commit** the `FEATURES.md` update and **`git push origin feat/ollama-provider`** (3 quiz-fix
   commits + the docs are currently local).
2. Pick the next build: **Phase 7 Dashboard v2** (recommended first slice **7.1 + 7.2 + 7.3** —
   make the dashboard concept-first + mastery distribution + accuracy-by-difficulty; spec in
   `FEATURES.md`) **or** **#5 AI assistant** (not started).
3. **Open a PR** `feat/ollama-provider` → `main` (the branch holds far more than the Ollama
   provider now; consider renaming or just note it in the PR).
4. Optional: load the taxonomy into the DB (`POST /api/admin/seed-taxonomy` with `SEED_TOKEN`); or
   switch `LLM_PROVIDER=gemini` (drop the `GEMINI_MODEL` line) for faster, higher-quality questions.

---

## 2026-10-27 — Phase 5A: cross-domain analogy flashcards (#10)

**Completed** (branch `feat/phase-5a-connections`, test-first) — `connections.ts` (unit-tested):
`pickAnalogyAnchor` deterministically chooses the learner's strongest _other_ well-practised
subject. New `connection` flashcard type (migration `0006` widens the type check). Mock + the
`LLMProvider` generate an analogy card; `/api/attempts` creates one (best-effort, de-duplicated)
when the learner missed something and has a known subject to anchor to. Flashcards page gains a
"Connections" section. Verified: 75 tests + 7 e2e (mock) + build green.

**Blocked on user**: apply `supabase/migrations/0006_connection_flashcards.sql`.

**5B decision**: RAG/pgvector **deferred** (user's call) — small corpus + embeddings cost; #10 is
delivered via 5A. Design captured in `improve.md` ("Designed, deferred"). Next: Phase 6 (AI
assistant, #5).

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
