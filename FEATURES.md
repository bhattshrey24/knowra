# Knowra — Features

Status legend: ⬜ not started · 🟨 in progress · ✅ done (acceptance criteria verified)

> Acceptance criteria are marked done only after verification (tests + manual check).

## Phase 0 — Foundation (🟨 in progress)

- ✅ Next.js 15 + TS + Tailwind v4 + shadcn/ui scaffold; `pnpm check` green
- ✅ App shell: landing page, home (domain grid + search), quiz-start (difficulty 1–5), dashboard
  & flashcards empty states; mobile-first, accessible, Linear-adapted design
- ✅ PWA baseline: manifest, icon, theme-color, service worker (prod), apple-web-app meta
- ✅ Test harness: Vitest unit test + Playwright e2e smoke, both passing locally
- ⬜ CI (GitHub Actions) green on a pushed PR
- ⬜ Supabase cloud project + baseline migration applied (**needs user login**)
- ⬜ Deploy to Vercel (**needs user login**)

## MVP features (sequenced across phases; none removed)

| #   | Feature                                    | Phase | Status | Acceptance criteria (summary)                                                                               |
| --- | ------------------------------------------ | ----- | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Predefined domains homepage                | 1     | 🟨     | Home lists math/science/history/politics/music; selecting one starts a quiz. (UI done; quiz wiring pending) |
| 2   | Custom topic search                        | 4     | ⬜     | Search any topic; map to existing domain or create new; progress reviewable by domain.                      |
| 3   | Adjustable difficulty 1–5 + recommendation | 1 / 4 | 🟨     | User picks 1–5 (UI done); later system recommends, user overrides.                                          |
| 4   | Weakness detection + flashcards            | 2     | ⬜     | Wrong answers → concepts → weakness cards; foundational cards too; types visibly distinct.                  |
| 5   | AI learning assistant (chatbot)            | 6     | ⬜     | Optional; answers scoped to user's profile/mistakes; provider-agnostic.                                     |
| 6   | Spaced repetition + reminders              | 3     | ⬜     | SM-2 scheduling; items become due days/weeks later; recall tested over time.                                |
| 7   | 80/20 prioritization                       | 4     | ⬜     | Foundational/high-value concepts surfaced first; depth is opt-in.                                           |
| 8   | Holistic knowledge profile                 | 2     | ⬜     | Cross-domain mastery (e.g. Math 4/10, Science 8/10); used for recommendations.                              |
| 9   | Progress dashboard & analytics             | 3     | ⬜     | Per-domain accuracy, mastery, gains, retention over time with graphs.                                       |
| 10  | Cross-domain concept connections           | 5     | ⬜     | Analogy cards link new concepts to familiar ones (e.g. guitar harmonics → waves).                           |
| 11  | Multiple question formats                  | 1 / 4 | ⬜     | MCQ first; then multi-select and written (LLM-graded + deterministic fallback).                             |
| 12  | Foundational gap detection                 | 4     | ⬜     | Detect weak prerequisites; recommend targeted revision before advancing.                                    |
| 13  | Baseline + long-term measurement           | 3     | ⬜     | Baseline per topic; retention tested with new questions on same concept.                                    |
| 14  | Progressive load management                | 4     | ⬜     | Focused questions/explanations; complexity grows with mastery.                                              |

## Outstanding / blocked

- **External setup needing user login:** Supabase cloud project, Vercel deployment, GitHub remote +
  branch protection. Everything is prepared to wire these in.
