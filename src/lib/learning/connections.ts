/**
 * Cross-domain connections (#10): pick a subject the learner already knows well
 * to anchor an analogy for a weaker subject (e.g. explain wave physics via the
 * music they're strong in). Deterministic — the LLM only writes the analogy,
 * this engine chooses the anchor.
 */

export interface AnchorSubject {
  slug: string;
  mastery: number;
  attempts: number;
}

/** A subject counts as "known" (usable as an analogy anchor) above these. */
const KNOWN_MASTERY = 0.5;
const KNOWN_ATTEMPTS = 3;

/** The strongest well-practised subject other than `targetSlug`, or null. */
export function pickAnalogyAnchor(targetSlug: string, subjects: AnchorSubject[]): string | null {
  const candidates = subjects
    .filter(
      (s) => s.slug !== targetSlug && s.mastery >= KNOWN_MASTERY && s.attempts >= KNOWN_ATTEMPTS,
    )
    .sort((a, b) => b.mastery - a.mastery || b.attempts - a.attempts);
  return candidates[0]?.slug ?? null;
}
