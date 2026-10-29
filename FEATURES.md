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

## Phase 2 — Learning engine + persistence 🟨

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

## Phase 3 — Spaced repetition & analytics 🟨

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

## Phase 7 — Dashboard v2: deeper insights ⬜

The dashboard is currently a **hybrid**: the concept/topic sections use the new hierarchy, but the
headline stats, Focus areas, accuracy-over-time, and the **By subject** view still come from the
legacy flat `domain_mastery`/`quiz_attempts.domain_slug` tables (so a subject number isn't the
roll-up of its concepts). We also barely use the richest signals we already collect —
`attempt_answers.concept_id`, per-attempt `difficulty`, timestamps, and flashcard SM-2 retention.
This phase makes the whole dashboard concept-first and surfaces more meaningful progress insights.

Recommended first slice: **7.1 + 7.2 + 7.3** (makes it concept-first, adds strengths/weaknesses,
introduces accuracy-by-difficulty). Follow the dataviz guidance for new charts; keep the theme.

- ⬜ **7.1 Unify on the hierarchy + drill-down:** Derive the subject view from concept aggregation
  (`aggregateByLevel("subject")`) so Subject → Topic → Concept are one consistent, expandable tree
  (tap a subject → its topics → its concepts). Each node shows mastery /10 **and a coverage bar**
  ("explored 12 of 40 concepts"), reusing the `coverage` already computed.
- ⬜ **7.2 Mastery distribution per subject:** A stacked bar / donut of how many concepts are
  **weak / learning / mastered / unassessed** (reuse the `concept-selection` buckets) — strengths
  as well as weaknesses, at a glance.
- ⬜ **7.3 Accuracy by difficulty:** A 1–5 bar chart of accuracy at each difficulty (we store
  per-attempt difficulty + correctness), visually separating **question difficulty** from
  **mastery** (ties to 6.6).
- ⬜ **7.4 Retention & revision panel:** Cards **due now**, a **"due over the next 7 days"** mini-bar,
  and a **retention rate** (% recalled from reviews) — from `flashcards`/SM-2, today only on the
  flashcards page.
- ⬜ **7.5 Learning momentum:** A **streak** and a GitHub-style **weekly activity heatmap** from
  `created_at`.
- ⬜ **7.6 Knowledge-map radar:** A radar chart of mastery across engaged subjects — one picture of
  breadth/balance.
- ⬜ **7.7 Per-subject accuracy trend:** Filter the existing accuracy-over-time by subject instead
  of one global line.

> **Note:** A true **mastery-over-time** line needs historical snapshots (we only store _current_
> mastery) — a small daily-snapshot table if we want real trend lines; otherwise accuracy-over-time
> is the proxy. Keep all metric computation in the deterministic engine; charts only render it.

## MVP features (sequenced across phases; none removed)

| #   | Feature                               | Phase     | Status | Notes                                                                                               |
| --- | ------------------------------------- | --------- | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | Predefined domains homepage           | 1 / 2     | ✅     | Redesigned taxonomy homepage (search + catalogue tabs + continue-learning); 24 subjects.            |
| 2   | Custom topic search                   | 4 / 6     | ✅     | Search subjects/topics/concepts; no match → LLM search-create (6.3) classifies into taxonomy.       |
| 3   | Adjustable difficulty 1–5 + recommend | 1 / 4 / 6 | ✅     | Adaptive-by-default (6.6) from mastery + recent perf; consistent level guidelines; manual override. |
| 4   | Weakness detection + flashcards       | 2 / 6     | ✅     | Weakness/foundational/connection cards, concept-tagged; weakest-first revision.                     |
| 5   | AI learning assistant (chatbot)       | 6         | ⬜     | **Not started** — the one remaining MVP feature. Scoped to user's profile/mistakes.                 |
| 6   | Spaced repetition + reminders         | 3 / 6     | ✅     | Unified flip-and-rate review (SM-2); retention folds into concept mastery (6.7). Reminders later.   |
| 7   | 80/20 prioritization                  | 4 / 6     | ✅     | Dashboard focus areas + concept-level balanced selection (weak/unassessed/retention) (6.2).         |
| 8   | Holistic knowledge profile            | 2 / 6     | ✅     | Subject + concept→topic rollups + weakest concepts + uncertainty on dashboard (6.1/6.2).            |
| 9   | Progress dashboard & analytics        | 3         | ✅     | Stat tiles, accuracy chart, mastery + gains. **Deeper insights planned in Phase 7.**                |
| 10  | Cross-domain concept connections      | 5         | ✅     | Analogy flashcards link weak concepts to a known subject. Semantic RAG deferred (improve.md).       |
| 11  | Multiple question formats             | 1 / 4     | ✅     | MCQ + multi-select + written; checkbox mix, count slider (5–30), timer.                             |
| 12  | Foundational gap detection            | 4         | 🟨     | Low-mastery "shore up the basics" hints; prerequisite-graph detection still future.                 |
| 13  | Baseline + long-term measurement      | 3         | 🟨     | Baseline→now gain per domain shown; mastery-over-time needs snapshots (Phase 7 note).               |
| 14  | Progressive load management           | 4 / 6     | ✅     | Adaptive difficulty rises with mastery/confidence under a progressive-load cap.                     |

## Outstanding / blocked

- **Supabase: done.** Cloud project connected, migrations `0001`–`0009` applied, Anonymous
  sign-ins enabled (2026-10-29). DB-backed features run live. _Optional:_ seed the taxonomy into
  the DB via `POST /api/admin/seed-taxonomy` (needs `SEED_TOKEN`); until then `getTaxonomy()` serves
  the in-memory 24-subject seed.
- **LLM provider:** default is local **Ollama** (`llama3.2:1b`) — works but slow/modest on CPU;
  generation now runs in ≤6-question sequential chunks to avoid timeouts. A Gemini key is present
  for a faster/higher-quality option (`LLM_PROVIDER=gemini`, drop the `GEMINI_MODEL` line).
- **Still to do:** #5 AI assistant (not started); **Phase 7 Dashboard v2** (deeper insights); open a
  PR from `feat/ollama-provider` into `main` (branch name no longer reflects its contents); Vercel
  deployment (user's dashboard task).
- **Known limitation:** answers are also scored client-side for instant feedback, but `/api/attempts`
  **re-scores server-side** from the reference/answer key before persisting — so stored mastery is
  trustworthy. Tracked in `improve.md`.
