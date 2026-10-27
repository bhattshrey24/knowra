/**
 * A "learnable" is anything a user can be quizzed on: a predefined domain
 * (FEATURES.md #1) or a custom topic they searched for (#2). Both are keyed by
 * a slug and roll up progress the same way (attempts, mastery, flashcards are
 * all keyed by that slug). Custom slugs are prefixed `t-` so they can never
 * collide with a predefined domain slug.
 */

import { DOMAINS } from "@/lib/domains";

export interface Learnable {
  slug: string;
  name: string;
  description: string;
  isCustom: boolean;
}

export const CUSTOM_PREFIX = "t-";

/** Collapse whitespace and trim, preserving the user's casing. */
export function normalizeTopicTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

/** Deterministic, collision-proof slug for a custom topic title. */
export function customSlug(title: string): string {
  const kebab = normalizeTopicTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${CUSTOM_PREFIX}${kebab}`;
}

/** Resolve a predefined domain by slug, or null (custom slugs resolve via the DB). */
export function predefinedLearnable(slug: string): Learnable | null {
  const d = DOMAINS.find((x) => x.slug === slug);
  return d ? { slug: d.slug, name: d.name, description: d.description, isCustom: false } : null;
}

export function isCustomSlug(slug: string): boolean {
  return slug.startsWith(CUSTOM_PREFIX);
}
