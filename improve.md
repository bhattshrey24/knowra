# Improvements & Technical Debt

Prioritized by impact × risk. Not a feature backlog (that's `FEATURES.md`) — this is engineering
quality, debt, and upgrades.

## Designed, deferred

- **RAG / pgvector semantic retrieval (Phase 5B, #10 enhancement).** Deferred deliberately: the
  cross-domain feature (#10) already ships via deterministic analogy anchors, the content corpus is
  small, and good embeddings need an API key / cost — the original plan said "start with SQL, add
  vectors where they earn it." **Design when revisited:** enable the `pgvector` extension
  (migration); add an `embedding vector(768)` column to `flashcards` (and/or a `concepts` table);
  embed on write behind the LLM-provider abstraction — `EmbeddingProvider` with a Gemini
  `text-embedding-004` implementation (free tier) and a deterministic keyword-hash fallback for
  $0/offline; expose `relatedTo(text, k)` via a pgvector cosine-distance query (`<=>`) guarded by
  RLS; use it to (a) target better analogy anchors, (b) dedupe near-identical questions, (c)
  retrieve context for the Phase 6 assistant. Keep it behind `isEmbeddingsConfigured()` so the app
  stays fully functional without it.

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
- **Node runtime → 22.** Project runs on Node 20.20 (pinned by a `~/.local/bin/node` shim). Two
  consequences: (1) Vitest 5 / jsdom 30 want Node 22+ (we pin v4/v26); (2) `@supabase/supabase-js`
  needs a native `WebSocket` (Node 22+), so `src/lib/db/{server,admin}.ts` and
  `scripts/check-supabase.mjs` supply `ws` as the realtime transport. Once the runtime is Node 22+
  everywhere (local + CI; Vercel already is), drop the `ws` transport and consider latest Vitest.
- **Rate limiting.** Add per-user rate limiting on LLM endpoints before any public exposure
  (protects the free-tier quota and prevents abuse).
- **`shadcn` + `tw-animate-css` in `dependencies`.** The init placed these in `dependencies`;
  evaluate moving `shadcn` to `devDependencies`.

## Low

- **Question bank pre-generation.** Cache/seed a bank of generated questions per concept to avoid
  live LLM rate limits during demos.
- **Lighthouse/a11y pass.** Run Lighthouse + axe on key pages once content is real.
