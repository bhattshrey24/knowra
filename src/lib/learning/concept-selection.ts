/**
 * Balanced concept selection for subject/topic quizzes (Phase 6.2): choose a
 * mix of weak concepts, unassessed concepts, and previously mastered concepts
 * due for a retention check. Deterministic and LLM-independent.
 *
 * A concept is only called weak or mastered once there's enough evidence
 * (`MIN_EVIDENCE` attempts) — never from a single response.
 */

import type { MasteryState } from "@/lib/learning/mastery";

export interface ConceptCandidate {
  id: string;
  /** Current mastery, or undefined if never assessed. */
  state?: MasteryState;
  /** Days since this concept was last practised (for retention scheduling). */
  lastSeenDaysAgo?: number;
}

export type SelectionReason = "weak" | "unassessed" | "retention" | "practice";

export interface SelectedConcept {
  id: string;
  reason: SelectionReason;
}

/** Attempts required before a concept can be judged weak or mastered. */
export const MIN_EVIDENCE = 2;
const WEAK_BELOW = 0.5;
const MASTERED_AT = 0.75;
/** A mastered concept unseen for this many days is due for a retention check. */
const RETENTION_DAYS = 7;

function classify(c: ConceptCandidate): SelectionReason {
  const s = c.state;
  if (!s || s.attempts < MIN_EVIDENCE) return "unassessed";
  if (s.mastery < WEAK_BELOW) return "weak";
  if (s.mastery >= MASTERED_AT) {
    return (c.lastSeenDaysAgo ?? 0) >= RETENTION_DAYS ? "retention" : "practice";
  }
  return "practice"; // mid-mastery: still being learned
}

/**
 * Pick up to `count` distinct concepts for a quiz, balancing weak → unassessed
 * → retention round-robin, then filling any remainder with mid/mastered
 * practice. Returns fewer than `count` only when there aren't enough concepts.
 */
export function selectConceptsForQuiz(
  candidates: ConceptCandidate[],
  count: number,
): SelectedConcept[] {
  if (count <= 0) return [];

  const weak: SelectedConcept[] = [];
  const unassessed: SelectedConcept[] = [];
  const retention: SelectedConcept[] = [];
  const practice: SelectedConcept[] = [];

  for (const c of candidates) {
    const reason = classify(c);
    const entry = { id: c.id, reason };
    if (reason === "weak") weak.push(entry);
    else if (reason === "unassessed") unassessed.push(entry);
    else if (reason === "retention") retention.push(entry);
    else practice.push(entry);
  }

  // Weakest first; most-overdue retention first. Unassessed/practice keep the
  // caller's (taxonomy) order for stability.
  weak.sort((a, b) => masteryOf(candidates, a.id) - masteryOf(candidates, b.id));
  retention.sort((a, b) => lastSeenOf(candidates, b.id) - lastSeenOf(candidates, a.id));

  const picked: SelectedConcept[] = [];
  const queues = [weak, unassessed, retention];
  let i = 0;
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length];
    if (q.length > 0) picked.push(q.shift()!);
    i += 1;
  }
  while (picked.length < count && practice.length > 0) picked.push(practice.shift()!);

  return picked;
}

function masteryOf(candidates: ConceptCandidate[], id: string): number {
  return candidates.find((c) => c.id === id)?.state?.mastery ?? 0;
}

function lastSeenOf(candidates: ConceptCandidate[], id: string): number {
  return candidates.find((c) => c.id === id)?.lastSeenDaysAgo ?? 0;
}
