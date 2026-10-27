# Knowra — Design Direction

**Reference chosen:** Linear (`DESIGN.md` from
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)).
Treated as a starting point, adapted to Knowra's identity — not a rigid template.

## Why Linear

Knowra is dashboard- and data-heavy: quiz interfaces, flashcards, progress analytics, and a
cross-domain knowledge profile. Linear's system is built for exactly this feel — precise,
uncluttered, fast, and calm — which matches the brief's "aesthetically polished, uncluttered,
intuitive". Alternatives considered: Notion (warmer, but less dashboard-oriented), Claude (warm
editorial, reading-first), Stripe (premium but marketing-heavy). Linear best serves a focused
learning tool.

## Principles (adapted from Linear)

1. **Clarity over decoration.** Generous whitespace, one clear action per screen, minimal chrome.
2. **Precision.** Tight type (`tracking-tight` on headings), consistent 0.5rem radius, hairline
   borders (`border-border/60`) instead of heavy shadows.
3. **Calm surfaces, one accent.** Neutral backgrounds; a single indigo accent for primary actions,
   focus, and active nav — never competing colors.
4. **Content-first motion.** Subtle transitions only (hover/active), no gratuitous animation.
5. **Accessible & responsive by default.** Mobile-first layouts, visible focus rings, semantic
   roles, meaningful empty/loading/error states.

## Tokens (in `src/app/globals.css`, oklch)

- **Primary (indigo):** light `oklch(0.52 0.22 277)`, dark `oklch(0.62 0.19 277)` — Knowra's
  identity color (a Linear-like violet, slightly warmer).
- **Neutrals:** near-white/near-black backgrounds; muted foreground for secondary text.
- **Accent:** a faint indigo-tinted surface for active nav, icon chips, and selected states.
- **Radius:** `0.5rem` base (crisper than the scaffold default).
- **Charts:** 5-color categorical palette (indigo, teal, amber, rose, violet) for Phase 3
  analytics. Revisit with the dataviz guidance when building real charts.
- **Fonts:** Geist Sans (UI) + Geist Mono (code/numerals), via `--font-sans` / `--font-geist-mono`.

## Components

shadcn/ui ("base-nova" style, Base UI primitives). Compose polymorphism with the **`render`**
prop. Shared app components live in `src/components` (`AppNav`, `DomainCard`, `DifficultyPicker`,
`EmptyState`); generated primitives in `src/components/ui`.

## Identity

Wordmark **Knowra** with an indigo full-stop (`Knowra.`). Tagline: _Learn by testing yourself._
The three product principles (active recall, 80/20 focus, spaced repetition) anchor the landing
page and should recur as the product's throughline.
