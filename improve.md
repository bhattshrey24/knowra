# Improvements & Technical Debt

Prioritized by impact × risk. Not a feature backlog (that's `FEATURES.md`) — this is engineering
quality, debt, and upgrades.

## High impact

- **Server-side quiz scoring.** Phase 1 returns correct indices in the `/api/quiz` payload and
  scores on the client, so a determined user could read the answers. Once quiz attempts persist
  (Phase 2), generate+store the quiz server-side and score on submit, returning only what the UI
  needs. Also move rate-limiting to a shared store (see below) at that point.
- **Shared-store rate limiting.** `src/lib/rate-limit.ts` is in-memory/per-instance. On Vercel,
  move to Supabase or Upstash for correctness across instances.
- **Service worker caching strategy.** The current `public/sw.js` is a minimal network-first shell
  cache. Before relying on offline, add versioned precaching of the app shell and a proper update
  flow (skipWaiting + client reload prompt). Consider `@serwist/next` if hand-rolling grows.
- **PNG/maskable PWA icons.** Currently an SVG icon only. Add 192/512 maskable PNGs for best
  install experience across Android/Chrome.
- **Spaced-repetition algorithm.** Ship SM-2 (simple, testable) in Phase 3; evaluate upgrading to
  **FSRS** once there's attempt data — better scheduling, more complex.

## Medium

- **Dark mode toggle.** Theme tokens already support `.dark`; add `next-themes` + a toggle when UI
  polish time allows.
- **Node runtime.** Project runs on Node 20.20. Vitest 5 / jsdom 30 want Node 22+. If CI uses Node
  22, we could move back to latest Vitest/jsdom; keep local and CI Node versions aligned.
- **Rate limiting.** Add per-user rate limiting on LLM endpoints before any public exposure
  (protects the free-tier quota and prevents abuse).
- **`shadcn` + `tw-animate-css` in `dependencies`.** The init placed these in `dependencies`;
  evaluate moving `shadcn` to `devDependencies`.

## Low

- **Question bank pre-generation.** Cache/seed a bank of generated questions per concept to avoid
  live LLM rate limits during demos.
- **Lighthouse/a11y pass.** Run Lighthouse + axe on key pages once content is real.
