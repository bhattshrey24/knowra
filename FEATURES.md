# Knowra — Features

Status legend: ⬜ not started · 🟨 partial (phased) · ✅ done (acceptance criteria verified)

> Acceptance criteria are marked done only after verification (tests + manual/e2e check).

## Phase 0 — Foundation ✅

- ✅ Next.js 15 + TS + Tailwind v4 + shadcn/ui scaffold; `pnpm check` green
- ✅ App shell, Linear-adapted design, PWA baseline (manifest, icon, service worker)
- ✅ Test harness (Vitest + Playwright); public GitHub repo; **CI green**

## Phase 1 — Core quiz loop ✅

- ✅ Provider-agnostic LLM layer: `MockLLMProvider` (free default), `GeminiProvider` (structured
  output + injectable fetch), `getLLMProvider()` factory
- ✅ Untrusted-output validation (`parseLlmMcqs`) + deterministic scoring engine (`scoreQuiz`)
- ✅ `POST /api/quiz` route: zod-validated input, rate-limited, mock provider by default
- ✅ Interactive quiz UI: difficulty 1–5 → generated MCQs → per-question feedback → score
- ✅ Verified: 26 unit/integration tests + 4 e2e (full quiz loop) passing

## Phase 2 — Learning engine + persistence ✅

- ✅ Supabase connected; migrations `0001` (profiles) + `0002` (quiz_attempts, attempt_answers,
  domain_mastery, flashcards) with RLS on every table
- ✅ Deterministic mastery engine (`mastery.ts`) — unit-tested; LLM-independent
- ✅ Anonymous auth (no login wall); session middleware; graceful mock mode without keys
- ✅ `POST /api/attempts` persists attempts + folds outcomes into domain mastery (server-side)
- ✅ Dashboard knowledge profile (per-domain X/10 + accuracy) from real data (#8)
- ✅ Weakness + foundational flashcards (#4): generated from quiz results (deterministic,
  de-duplicated), shown on the Flashcards page in distinct sections
- ✅ Live: all migrations `0001`–`0009` applied and Anonymous sign-ins enabled (2026-10-29). The
  DB-backed flow (attempts → mastery → flashcards → concept mastery) runs end-to-end.

## Phase 3 — Spaced repetition & analytics ✅

- ✅ Deterministic **SM-2** scheduling engine (`sm2.ts`) — unit-tested
- ✅ Migration `0003`: scheduling columns on flashcards (reps, ease, interval, due_at)
- ✅ Review flow: "Due for review" session with Again/Hard/Good/Easy → `POST /api/flashcards/review`
  reschedules each card (#6)
- ✅ Live: migration `0003` applied (see Phase 2 note). SM-2 review flow reschedules cards.
- ✅ Analytics dashboard (#9): stat tiles + accuracy-over-time chart (hover + table fallback) +
  per-domain mastery with baseline→now learning gains (#13)

## Phase 4 — Personalization ✅

- ✅ 4A: Deterministic difficulty recommendation (`recommend.ts`, unit-tested) — suggested level
  shown + pre-selected on the quiz screen, with progressive load (holds back hardest until
  confidence builds) (#3, #14). User always overrides.
- ✅ 4B: Custom topic search (#2) — type any topic, quiz on it; it becomes its own subject that
  rolls up attempts/mastery/flashcards (migration `0004`)
- ✅ 4C: Multi-select format (#11) — format picker on the quiz screen; checkbox UI; set-equality
  scoring; persists + makes flashcards like MCQ (no migration)
- ✅ 4D: Written (free-text) format (#11) — textarea UI; deterministic word-overlap grading
  (`grade-written.ts`); persists written answers (migration `0005`); makes flashcards
- ✅ 4E: Lightweight 80/20 focus areas (#7) — dashboard "Focus areas" ranks weakest engaged
  subjects — and foundational-gap hints (#12) — "shore up the basics" nudge on low-mastery subjects.
  Full concept/prerequisite graph is future work (improve.md).

## Phase 5 — Cross-domain connections ✅

- ✅ 5A: Cross-domain analogy flashcards (#10) — deterministic anchor picker (`connections.ts`,
  unit-tested) chooses a subject you already know well; the LLM writes an analogy linking your
  weak concept to it. New `connection` flashcard type + section (migration `0006`).
- ⏸️ 5B: RAG / pgvector semantic retrieval — **deliberately deferred** (small corpus, embeddings
  cost); #10 is delivered via 5A. Design documented in `improve.md`.

## Phase 6 — Concept-level taxonomy & adaptive mastery 🟨 (code complete; verify live)

Deepens the model from flat subjects to a `Subject → Topic → Concept` taxonomy so mastery,
quizzing, and revision operate at the concept level. Extends the concept-level "later" notes on
#2, #3, #7, #8, #12, #13, #14 — the LLM proposes classifications and questions; application logic
validates every taxonomy relationship, question structure, answer key, and difficulty tag.

**Status:** 6.1 ✅; 6.2–6.7 🟨 (code + unit tests complete, deterministic engines fully tested;
DB-backed behaviour runs live now that migrations are applied — exercise it to confirm). The only
MVP feature not started is the AI assistant (#5). Each sub-item below has its own detailed note.

- ✅ **6.1 Hierarchy:** Model `Subject → Topic → Concept`. Every generated question is mapped to its
  underlying concept. Concepts may relate to multiple topics/subjects **without duplication**
  (shared concept, many links). _Landed: deterministic taxonomy engine (`learning/taxonomy.ts`,
  unit-tested — validation + scope→concepts resolution), seed catalog (`taxonomy/seed.ts`),
  shared-taxonomy schema (migration `0007`, service-role writes / authenticated read), DB access +
  idempotent seed loader (`db/taxonomy-server.ts`, round-trip-tested row mapping; `getTaxonomy()`
  reads the DB catalog, falling back to the seed; load via `POST /api/admin/seed-taxonomy` guarded
  by `SEED_TOKEN`), and concept tagging of generated questions — the LLM proposes a per-question
  concept label, the app validates it against the scope's concepts with a deterministic round-robin
  fallback (`learning/concept-tagging.ts`). Subject quizzes now spread across their concepts; every
  question carries a real `conceptId`. Custom topics keep their own slug until 6.3 classifies them.
  Verified: 124 unit/integration tests + build. (Quizzing *at* topic/concept level and concept-level
  mastery tracking are 6.2.)_
- 🟨 **6.2 Quizzing & revision at all three levels:** Let users quiz at subject, topic, or concept
  level. Track results at the concept level and aggregate up into topic- and subject-level stats
  for dashboards, flashcards, and revision. Subject-level quizzes **balance** weak concepts,
  unassessed concepts, and previously mastered concepts due for a retention check. _Landed:
  quizzing at any level (scope-aware generation, from the homepage step); concept-level mastery
  tracking — deterministic `foldConceptMastery` + `aggregateByLevel` (concept→topic→subject),
  unit-tested; migration `0008` (`concept_mastery` + `attempt_answers.concept_id`); `/api/attempts`
  records each tagged answer's outcome and updates concept mastery. Balanced subject/topic-quiz
  selection — `selectConceptsForQuiz` (unit-tested) picks a weak / unassessed / retention-due mix
  with a min-evidence gate (never weak/mastered from a single response); `/api/quiz` uses it with
  the learner's `concept_mastery` (degrades to a clean spread without data). Dashboard surfaces the
  concept→topic rollups (`aggregateByLevel`) as a "By topic" breakdown plus a "Weakest concepts"
  list that deep-links to concept quizzes (`weakestConcepts`, min-evidence gated). Flashcards are
  concept-aware: cards carry `concept_id` (migration `0009`), the study view shows the concept, and
  the Due-for-review queue is ordered weakest-concept-first (`orderByConceptWeakness`). **All of
  6.2's code is in; live verification needs migrations `0007`–`0009` applied + anon auth.**_
- 🟨 **6.3 Search & create:** Homepage search bar over existing subjects/topics/concepts. If no
  match, the user describes what they want to learn; the LLM proposes a classification, checks for
  duplicates and valid relationships, and the user can correct it before saving. _Landed: LLM
  `classify` behind the provider interface (mock/gemini/ollama, zod-validated); deterministic
  `resolveClassification` (`learning/classify.ts`, unit-tested) matches proposed names to existing
  nodes (reuse vs. new), detects duplicates, and mints collision-free slugs; `POST /api/classify`
  proposes and `POST /api/learn` saves (re-resolved server-side, idempotent upserts via
  `saveClassification`); `LearnCreate` lets the learner edit the Subject→Topic→Concept before
  starting, then quizzes the new concept. `resolveLearnable` now resolves taxonomy subjects so
  user-added ones are quizzable. Needs a real LLM + seeded DB to classify well live._
- 🟨 **6.4 Initial taxonomy seed:** Seed the DB with a diverse, reasonably comprehensive set of
  subjects, topics, and concepts. The taxonomy expands as users explore new areas, **without
  creating duplicate entries**. _Landed: a 24-subject catalogue (~75 topics, ~215 concepts) across
  STEM, humanities, arts, social science, business and more (`taxonomy/seed.ts`, derived from
  `DOMAINS` so every subject is quizzable). Loading into the DB still needs migration `0007`
  applied + `POST /api/admin/seed-taxonomy`; until then `getTaxonomy()` serves this seed._
- 🟨 **6.4a Curated sample question bank (fallback):** A hand-authored, LLM-independent bank of
  correct questions keyed to real concepts (`src/lib/learning/question-bank{,-data}.ts`), covering a
  representative set across Mathematics, Science, and Computer Science. Quizzing is **LLM-first**;
  if generation fails or times out for covered content, the quiz route serves curated questions for
  the requested scope (flagged in the UI). If the LLM is unavailable **and** the content has no
  curated coverage (e.g. a custom topic), the route returns `503 {reason:"unavailable"}` and the UI
  says generation is temporarily unavailable — it never shows unrelated samples. _Covered by
  `tests/unit/question-bank.test.ts` + `tests/integration/quiz-curated-fallback.test.ts`._
- 🟨 **6.5 Adaptive diagnostics:** When a user picks an area with insufficient history, offer a
  short adaptive diagnostic to estimate concept-level mastery. Users may skip and start learning;
  mastery stays **uncertain** until there's enough evidence. Reuse reliable existing performance
  data rather than re-assessing. _Landed: deterministic engine (`learning/diagnostic.ts`,
  unit-tested) — `needsDiagnostic` (coverage-based), `planDiagnostic` (probes only concepts lacking
  evidence, reusing reliable ones, cycling difficulty), `isUncertain`. The quiz-start screen offers
  a "quick diagnostic" on a thin subject (skippable); `/api/quiz` `diagnostic` mode probes
  unassessed concepts; the dashboard flags low-confidence subjects/concepts as "Uncertain". Live
  verification needs seeded concept history. Per-question varied difficulty within one generation
  call is future work._
- 🟨 **6.6 Difficulty calibration:** Separate **question difficulty** from **user mastery**.
  Difficulty 1–5 with consistent, concept-calibrated guidelines (concept + reasoning required).
  Recommend difficulty from diagnostics, mastery estimates, recent performance, and learning
  goals; adaptive difficulty is the **default**, user can still choose their own. _Landed:
  consistent per-level guidelines (`learning/difficulty.ts`) fed into the generation prompt so a
  level means the same across concepts; `recommendAdaptiveDifficulty` (unit-tested) blends mastery
  band + recent accuracy with the progressive-load cap; the quiz-start screen defaults to
  **Adaptive** (Knowra picks the level, computed server-side from mastery + recent attempts), with
  a "Choose yourself" 1–5 override. Learning-goals input is future work._
- 🟨 **6.7 Learner profile:** Continuously update concept-level mastery and weaknesses from quiz
  attempts, accuracy, question difficulty, timestamps, and retention results where available.
  Derive topic-/subject-level insight from concept-level evidence. **Never** mark a concept
  weak/mastered from a single response. _Landed: concept mastery folds in accuracy + question
  difficulty (`updateMastery`) on every attempt, timestamps drive retention scheduling, and
  flashcard reviews now feed back as retention outcomes (`retentionOutcome` → `concept_mastery`);
  topic/subject insight is derived via `aggregateByLevel`; the min-evidence gate means no concept
  is called weak/mastered from a single response. Live verification needs accumulated history._

- ✅ **6.8 AI study-plan advisor (guardrailed):** Turn the deterministic knowledge profile into a
  readable "what to do next" plan. The engine selects the focus concepts and _why_
  (`buildStudyFocus`: due-for-review first, then weak → unassessed → retention) and the LLM only
  phrases/orders them via `LLMProvider.generateStudyPlan`. Guardrails: the model may reference
  **only** the engine-selected concepts (validated by `parseStudyPlan`, which also uses our
  authoritative concept names, not the model's), and any LLM failure falls back to a deterministic
  templated plan (`fallbackStudyPlan`) — so `POST /api/study-plan` never dead-ends. Surfaced on the
  quiz setup page (`StudyPlanCard`). _Covered by `tests/unit/study-plan{,-validation}.test.ts` +
  `tests/integration/study-plan-api.test.ts`._

- ✅ **#5 AI learning assistant (chatbot):** A profile-aware tutor at `/assistant`. The engine
  _observes and measures_; the LLM only phrases. `deriveLearningStyle`
  (`src/lib/learning/learning-style.ts`) derives how the learner engages (preferred format,
  verbosity, working difficulty, analogy affinity) from their own history, and
  `gatherLearnerContext` (`src/lib/db/learner-profile-server.ts`) assembles an authoritative
  snapshot (weak/unassessed/due focus via `buildStudyFocus`, subjects, display name). The LLM
  answers via `LLMProvider.tutorReply`, instructed to use **only** the supplied facts and to reply
  in the derived style (`buildTutorPrompt`). Guardrails: request + reply validated/bounded
  (`src/lib/validation/tutor.ts`), reply rendered as plain text, prompt-injection resisted, and any
  LLM failure (or no key) falls back to a deterministic grounded reply (`fallbackReply`) so the
  assistant never dead-ends. Conversation history is client-side only (ephemeral). _Covered by
  `tests/unit/learning-style.test.ts`, `tests/unit/tutor-context.test.ts`,
  `tests/integration/chat-api.test.ts`, `tests/e2e/assistant.spec.ts`._

- 🟨 **6.x Homepage & catalogue (supports 6.2/6.3):** Redesigned `/home` around the taxonomy — a
  prominent search bar ("Search any subject, topic or concept…") with "Try:" examples and live
  closest-match suggestions (`taxonomy/catalogue.ts`, unit-tested ranking); an Explore-the-catalogue
  Subjects/Topics/Concepts tab view where topic cards show their subject and concept cards show
  their topic + subject; and a Continue-learning section (recent subjects with progress + cards due
  for revision from real data, with an empty state for new users). Clicking a topic/concept routes
  to a scope-aware quiz (`?topic=`/`?concept=`) — `/api/quiz` accepts an in-subject scope and tags
  every question accordingly, reusing 6.1's concept resolution. _Still 6.2/6.3: concept-level
  mastery tracking + aggregation + subject-quiz balancing, and LLM-classified create-on-no-match._

> **Important:** Consistent taxonomy and concept tagging are essential across quizzes, flashcards,
> revision, learner profiles, and dashboards. Support concepts related to multiple topics/subjects
> without duplication. The LLM proposes classifications and generates questions; **application
> logic validates** taxonomy relationships, question structure, answer keys, and difficulty
> metadata. Keep all of this in the deterministic engine per the golden rules — the LLM never owns
> taxonomy or scoring.

## Phase 7 — Dashboard v2: deeper insights ✅

The dashboard is now concept-first and derives all progress signals from the underlying taxonomy and evidence.
All metric computation lives in the deterministic engine (`src/lib/learning/analytics.ts`), covered by unit tests.

- ✅ **7.1 Unify on the hierarchy + drill-down:** Derived the subject view from concept aggregation
  (`aggregateByLevel("subject")`). Subject → Topic → Concept is an expandable tree (`DashboardHierarchy`),
  where each node shows mastery /10 and coverage ("explored X of Y concepts").
- ✅ **7.2 Mastery distribution per subject:** Stacked distribution bar (`DistributionBar`) showing counts and
  percentages for **weak / learning / mastered / unassessed** concepts for each subject at a glance.
- ✅ **7.3 Accuracy by difficulty:** 1–5 bar chart (`DifficultyAccuracyChart`) comparing accuracy at each difficulty
  level, visually separating **question difficulty** from **mastery**.
- ✅ **7.4 Retention & revision panel:** Spaced repetition panel (`RetentionPanel`) displaying cards **due now**,
  a **7-day forecast distribution**, and the SM-2 **retention rate**.
- ✅ **7.5 Learning momentum:** Daily study **streak** with longest streak tracking and a 4-week GitHub-style
  **activity heatmap** (`ActivityHeatmap`).
- ✅ **7.6 Knowledge-map radar:** SVG radar chart (`KnowledgeRadar`) showing mastery breadth/balance across engaged subjects.
- ✅ **7.7 Per-subject accuracy trend:** `AccuracyChart` now features a subject filter to inspect the accuracy timeline
  for individual subjects as well as all subjects.

> **Note:** A true **mastery-over-time** line needs historical snapshots (we only store _current_
> mastery) — a small daily-snapshot table if we want real trend lines; otherwise accuracy-over-time
> is the proxy. Keep all metric computation in the deterministic engine; charts only render it.

## Phase 8 — Accounts & profiles (durable, cross-device logins) ✅

**The data layer is already multi-user.** Every user table has RLS (`auth.uid() = user_id`), a
`profiles` table auto-creates on signup via the `handle_new_user` trigger, and `AuthBootstrap`
signs each browser in **anonymously** — so two users already can't affect each other's knowledge
base. The only gap is **durable, cross-device accounts**: today an account is a per-browser
anonymous session that's lost on cookie-clear and can't follow the user to another device.

Goal: real login so each user has a persistent, isolated profile, **without a signup wall** and at
**$0**. No schema/RLS changes needed for isolation — this is mostly auth config + linking + UI.

- ✅ **8.1 Enable a free auth method:** OAuth (Google & GitHub) via standard Supabase redirect flow and code exchange route (`/auth/callback`), plus Email/Password signup & signin.
- ✅ **8.2 Anonymous → permanent linking:** When signing up or linking from an anonymous session, calls Supabase `updateUser({ email, password, data })` / `linkIdentity`, preserving the current user's `id` and keeping all attempts, mastery records, and flashcards intact without manual row migration.
- ✅ **8.3 Auth UI (anonymous-first):**
  - Sign-in page (`/login`) with tabbed Email vs OAuth sign-in/up and anonymous account upgrade detection.
  - Top-bar ProfileMenu in `AppNav` showing user initials/avatar, display name, Guest/Permanent badge, links to `/profile`, and sign-out.
  - Dismissible `AuthSyncBanner` on `/dashboard` nudging anonymous learners to secure their learning data.
  - Zero login wall: guest sessions still auto-created via `AuthBootstrap`.
- ✅ **8.4 Profiles & account hygiene:**
  - Editable display name with Zod validation via `GET`/`PATCH /api/profile`.
  - Migration `0010_profile_avatar.sql` adds optional `avatar_url`.
  - Account deletion (`DELETE /api/profile`) using admin Supabase client cascading through all user attempts, mastery, and flashcards.
  - Full settings UI on `/profile`.

**Cost = $0:** Supabase Auth is free (≈50k monthly active users), OAuth is free, Vercel Hobby is
free. No paid service introduced; the anon key stays public-safe, service-role stays server-only.

**Capacity at $0 — the binding limit is DB storage (500 MB free), not auth.** Per-user footprint is
dominated by `attempt_answers` storing full question text: heavy user ≈ 0.5–0.7 MB, typical ≈
100–150 KB, light ≈ 30–50 KB → roughly **700–1,000 heavy / 3,000–5,000 typical / ~10,000 light**
users on 500 MB. **One cheap trim multiplies this ~5×:** stop storing the question prompt/options
text in `attempt_answers` (keep only `concept_id`, `is_correct`, `difficulty`, `created_at` — all
the engine/analytics need) → heavy user ≈ 100 KB → **~5,000 heavy / 10,000+ typical**. Auth MAU
(50k) and egress (5 GB/mo) bind only far later; Supabase Pro ($25/mo, 8 GB) scales to ~100k+.

> **Caveats (not cost):** a free Supabase project **pauses after ~7 days idle** (needs steady
> traffic, a keep-alive ping, or Pro for a live user base); decide **anonymous-first vs
> login-required** (recommended: anonymous-first + upsell to link).

## MVP features (sequenced across phases; none removed)

| #   | Feature                               | Phase     | Status | Notes                                                                                               |
| --- | ------------------------------------- | --------- | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | Predefined domains homepage           | 1 / 2     | ✅     | Redesigned taxonomy homepage (search + catalogue tabs + continue-learning); 24 subjects.            |
| 2   | Custom topic search                   | 4 / 6     | ✅     | Search subjects/topics/concepts; no match → LLM search-create (6.3) classifies into taxonomy.       |
| 3   | Adjustable difficulty 1–5 + recommend | 1 / 4 / 6 | ✅     | Adaptive-by-default (6.6) from mastery + recent perf; consistent level guidelines; manual override. |
| 4   | Weakness detection + flashcards       | 2 / 6     | ✅     | Weakness/foundational/connection cards, concept-tagged; weakest-first revision.                     |
| 5   | AI learning assistant (chatbot)       | 6         | ✅     | Profile-aware tutor at `/assistant`; engine measures + derives learning style, LLM phrases only.    |
| 6   | Spaced repetition + reminders         | 3 / 6     | ✅     | Unified flip-and-rate review (SM-2); retention folds into concept mastery (6.7). Reminders later.   |
| 7   | 80/20 prioritization                  | 4 / 6     | ✅     | Dashboard focus areas + concept-level balanced selection (weak/unassessed/retention) (6.2).         |
| 8   | Holistic knowledge profile            | 2 / 6     | ✅     | Subject + concept→topic rollups + weakest concepts + uncertainty on dashboard (6.1/6.2).            |
| 9   | Progress dashboard & analytics        | 3 / 7     | ✅     | Stat tiles, accuracy chart, hierarchy drilldown, radar, streak heatmap, difficulty accuracy.        |
| 10  | Cross-domain concept connections      | 5         | ✅     | Analogy flashcards link weak concepts to a known subject. Semantic RAG deferred (improve.md).       |
| 11  | Multiple question formats             | 1 / 4     | ✅     | MCQ + multi-select + written; checkbox mix, count slider (5–30), timer.                             |
| 12  | Foundational gap detection            | 4         | 🟨     | Low-mastery "shore up the basics" hints; prerequisite-graph detection still future.                 |
| 13  | Baseline + long-term measurement      | 3         | 🟨     | Baseline→now gain per domain shown; mastery-over-time needs snapshots (Phase 7 note).               |
| 14  | Progressive load management           | 4 / 6     | ✅     | Adaptive difficulty rises with mastery/confidence under a progressive-load cap.                     |

## Outstanding / blocked

- **Supabase: live & verified.** Migrations `0001`–`0011` applied (including `0010_profile_avatar` and
  `0011_flashcard_update_policy`), Anonymous sign-ins and Email/GitHub Auth enabled. Free-tier built-in
  SMTP rate limits bypassed via server-side admin user creation (`/api/auth/register`).
- **LLM providers:**
  - Ollama (`llama3.2:1b`): Hardened against small-model field inversion bugs with strict `minItems: 4, maxItems: 4`
    schema constraints, system prompt instructions, and defensive Zod validation filters against JSON/prompt leakage.
  - Gemini: Supported natively (`LLM_PROVIDER=gemini`) via Google AI Studio (`gemini-flash-lite-latest` or `gemini-2.0-flash`).
- **CI / Tests:** All 191 unit & integration tests passing; Playwright e2e suites passing on GitHub Actions.
- **MVP features complete:** all 11 core MVP features (#1–#11) are now done; #12–#14 remain partial
  by design (see table). Feature #5 (AI learning assistant) landed on `feat/ai-assistant`.
- **Known limitation:** answers are also scored client-side for instant feedback, but `/api/attempts`
  **re-scores server-side** from the reference/answer key before persisting — so stored mastery is
  trustworthy. Tracked in `improve.md`.
