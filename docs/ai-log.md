# AI Implementation Log

Significant decisions, completed phases, open issues, and the next recommended action.
Newest first.

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
