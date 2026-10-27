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
- 🟨 Needs user action to verify live: apply `0002`, enable Anonymous sign-ins (attempts + mastery
  already verified live; take one more quiz to populate flashcards)

## Phase 3 — Spaced repetition & analytics 🟨

- ✅ Deterministic **SM-2** scheduling engine (`sm2.ts`) — unit-tested
- ✅ Migration `0003`: scheduling columns on flashcards (reps, ease, interval, due_at)
- ✅ Review flow: "Due for review" session with Again/Hard/Good/Easy → `POST /api/flashcards/review`
  reschedules each card (#6)
- 🟨 Needs user action: apply `0003`
- ✅ Analytics dashboard (#9): stat tiles + accuracy-over-time chart (hover + table fallback) +
  per-domain mastery with baseline→now learning gains (#13)

## Phase 4 — Personalization 🟨

- ✅ 4A: Deterministic difficulty recommendation (`recommend.ts`, unit-tested) — suggested level
  shown + pre-selected on the quiz screen, with progressive load (holds back hardest until
  confidence builds) (#3, #14). User always overrides.
- ✅ 4B: Custom topic search (#2) — type any topic, quiz on it; it becomes its own subject that
  rolls up attempts/mastery/flashcards (migration `0004`)
- ⬜ 4C: Multi-select + written question formats (#11)
- ⬜ 80/20 prioritization (#7), foundational-gap detection (#12) — lightweight versions planned

## MVP features (sequenced across phases; none removed)

| #   | Feature                               | Phase | Status | Notes                                                                                     |
| --- | ------------------------------------- | ----- | ------ | ----------------------------------------------------------------------------------------- |
| 1   | Predefined domains homepage           | 1 / 2 | ✅     | Home → select domain → real generated quiz; attempts persisted (anon auth + Supabase).    |
| 2   | Custom topic search                   | 4     | 🟨     | Quiz any typed topic; rolls up as its own subject. Verify live after `0004`.              |
| 3   | Adjustable difficulty 1–5 + recommend | 1 / 4 | ✅     | Select 1–5; system suggests a level from mastery (user overrides).                        |
| 4   | Weakness detection + flashcards       | 2     | 🟨     | Weakness (wrong) + foundational (right) cards, distinctly tagged; verify live via a quiz. |
| 5   | AI learning assistant (chatbot)       | 6     | ⬜     | Optional; scoped to user's profile/mistakes.                                              |
| 6   | Spaced repetition + reminders         | 3     | 🟨     | SM-2 review flow reschedules cards; verify live after `0003`. Reminders later.            |
| 7   | 80/20 prioritization                  | 4     | ⬜     | Foundational/high-value concepts first.                                                   |
| 8   | Holistic knowledge profile            | 2     | 🟨     | Per-domain mastery (X/10) on dashboard; verify live after migration + anon auth.          |
| 9   | Progress dashboard & analytics        | 3     | ✅     | Stat tiles, accuracy-over-time chart, per-domain mastery + learning gains.                |
| 10  | Cross-domain concept connections      | 5     | ⬜     | Analogy cards linking new concepts to familiar ones.                                      |
| 11  | Multiple question formats             | 1 / 4 | 🟨     | MCQ ✅; multi-select + written (LLM-graded) Phase 4.                                      |
| 12  | Foundational gap detection            | 4     | ⬜     | Detect weak prerequisites before advancing.                                               |
| 13  | Baseline + long-term measurement      | 3     | 🟨     | Baseline→now gain per domain shown; richer retention (new Qs over time) later.            |
| 14  | Progressive load management           | 4     | 🟨     | Recommended difficulty rises gradually with mastery/confidence; more to come.             |

## Outstanding / blocked

- **External setup needing user login:** Supabase cloud project (quiz attempts, profiles, mastery),
  Vercel deployment. The default mock provider keeps everything runnable/verifiable without keys.
- **Known Phase 1 limitation:** answers are scored client-side (correct indices are in the API
  payload). Move scoring server-side once attempts persist (Phase 2/3). Tracked in `improve.md`.
