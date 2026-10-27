/**
 * Lightweight 80/20 prioritization (#7) and foundational-gap hints (#12),
 * deterministic and operating at the subject level. A full concept/prerequisite
 * graph is future work (see improve.md); until then "focus on your weakest
 * engaged subjects" is a useful, honest approximation.
 */

export interface SubjectMastery {
  slug: string;
  mastery: number;
  confidence: number;
  attempts: number;
}

export type FocusReason = "weak" | "shaky" | "practice";

export interface FocusArea {
  slug: string;
  /** Higher = more worth focusing on now. */
  priority: number;
  reason: FocusReason;
}

/** Below this mastery, with enough attempts, a subject needs foundational work. */
const FOUNDATIONAL_THRESHOLD = 0.4;
const MIN_ATTEMPTS_FOR_SIGNAL = 3;
/** At/above this mastery a subject is considered solid, not a focus area. */
const SOLID_THRESHOLD = 0.7;

function reasonFor(s: SubjectMastery): FocusReason {
  if (s.mastery < FOUNDATIONAL_THRESHOLD) return "weak";
  if (s.confidence < 0.4) return "shaky";
  return "practice";
}

/** Weakest engaged subjects first; excludes solid and never-attempted subjects. */
export function focusAreas(subjects: SubjectMastery[], limit = 3): FocusArea[] {
  return subjects
    .filter((s) => s.attempts > 0 && s.mastery < SOLID_THRESHOLD)
    .map((s) => ({
      slug: s.slug,
      priority: 1 - s.mastery,
      reason: reasonFor(s),
      attempts: s.attempts,
    }))
    .sort((a, b) => b.priority - a.priority || b.attempts - a.attempts)
    .slice(0, limit)
    .map(({ slug, priority, reason }) => ({ slug, priority, reason }));
}

export function needsFoundationalWork(s: SubjectMastery): boolean {
  return s.attempts >= MIN_ATTEMPTS_FOR_SIGNAL && s.mastery < FOUNDATIONAL_THRESHOLD;
}
