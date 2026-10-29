/**
 * Adaptive diagnostics (Phase 6.5): decide when an area needs a quick
 * calibration quiz, which concepts to probe (reusing reliable existing data
 * rather than re-assessing), and when a mastery estimate is still uncertain.
 * Deterministic and LLM-independent.
 */

import type { Difficulty } from "@/types/learning";
import type { MasteryState } from "@/lib/learning/mastery";
import { MIN_EVIDENCE, type ConceptCandidate } from "@/lib/learning/concept-selection";

/** Below this coverage of assessed concepts, offer a diagnostic. */
const DIAGNOSTIC_COVERAGE = 0.5;
/** Confidence below this means the estimate is still uncertain. */
const UNCERTAIN_CONFIDENCE = 0.25;
/** Difficulties a diagnostic cycles through to probe the learner's level. */
const PROBE_DIFFICULTIES: Difficulty[] = [2, 3, 4];

function hasEvidence(c: ConceptCandidate): boolean {
  return (c.state?.attempts ?? 0) >= MIN_EVIDENCE;
}

/**
 * True when too few of the area's concepts have enough evidence to trust —
 * i.e. the learner has insufficient history here and a short diagnostic would
 * help. False for an empty area.
 */
export function needsDiagnostic(candidates: ConceptCandidate[]): boolean {
  if (candidates.length === 0) return false;
  const assessed = candidates.filter(hasEvidence).length;
  return assessed / candidates.length < DIAGNOSTIC_COVERAGE;
}

export interface DiagnosticProbe {
  conceptId: string;
  difficulty: Difficulty;
}

/**
 * Up to `count` concepts to probe, drawn only from those lacking reliable
 * evidence (reusing already-assessed concepts), each at a cycling difficulty
 * so the quiz spans levels. Preserves input (taxonomy) order for determinism.
 */
export function planDiagnostic(candidates: ConceptCandidate[], count: number): DiagnosticProbe[] {
  if (count <= 0) return [];
  return candidates
    .filter((c) => !hasEvidence(c))
    .slice(0, count)
    .map((c, i) => ({
      conceptId: c.id,
      difficulty: PROBE_DIFFICULTIES[i % PROBE_DIFFICULTIES.length],
    }));
}

/** Whether a mastery estimate is still too thin to trust (Phase 6.5). */
export function isUncertain(state: MasteryState | undefined): boolean {
  return !state || state.confidence < UNCERTAIN_CONFIDENCE;
}
