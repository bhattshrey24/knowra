/**
 * Concept-level mastery: folding quiz outcomes into per-concept state, and
 * aggregating that concept-level evidence up to topic and subject level
 * (Phase 6.2). Deterministic and LLM-independent — the knowledge profile is
 * always derived from concept evidence, never estimated by a model.
 */

import type { Difficulty } from "@/types/learning";
import { INITIAL_MASTERY, updateMastery, type MasteryState } from "@/lib/learning/mastery";
import { conceptsForScope, type Taxonomy } from "@/lib/learning/taxonomy";
import { MIN_EVIDENCE } from "@/lib/learning/concept-selection";

export interface ConceptOutcome {
  conceptId: string;
  correct: boolean;
  difficulty: Difficulty;
}

/**
 * Fold a quiz's per-concept outcomes into a map of concept id → mastery state,
 * building on any existing state. Pure: returns a new map.
 */
export function foldConceptMastery(
  prev: Map<string, MasteryState>,
  outcomes: ConceptOutcome[],
): Map<string, MasteryState> {
  const next = new Map(prev);
  for (const o of outcomes) {
    const current = next.get(o.conceptId) ?? INITIAL_MASTERY;
    next.set(o.conceptId, updateMastery(current, { correct: o.correct, difficulty: o.difficulty }));
  }
  return next;
}

export interface RollupStats {
  /** Attempts-weighted mean mastery of the node's *assessed* concepts (0..1). */
  mastery: number;
  attempts: number;
  correct: number;
  /** Concepts under this node that have at least one attempt. */
  conceptsAssessed: number;
  /** Concepts under this node in total. */
  conceptsTotal: number;
  /** conceptsAssessed / conceptsTotal (0 when the node has no concepts). */
  coverage: number;
}

function rollup(conceptIds: string[], byConcept: Map<string, MasteryState>): RollupStats {
  let attempts = 0;
  let correct = 0;
  let weightedMastery = 0;
  let assessed = 0;

  for (const id of conceptIds) {
    const state = byConcept.get(id);
    if (!state || state.attempts === 0) continue;
    assessed += 1;
    attempts += state.attempts;
    correct += state.correct;
    weightedMastery += state.mastery * state.attempts;
  }

  return {
    mastery: attempts > 0 ? weightedMastery / attempts : 0,
    attempts,
    correct,
    conceptsAssessed: assessed,
    conceptsTotal: conceptIds.length,
    coverage: conceptIds.length > 0 ? assessed / conceptIds.length : 0,
  };
}

/**
 * Roll concept mastery up to every subject or topic in the taxonomy. A shared
 * concept contributes to each node it belongs to.
 */
export function aggregateByLevel(
  byConcept: Map<string, MasteryState>,
  tax: Taxonomy,
  level: "subject" | "topic",
): Map<string, RollupStats> {
  const nodes = level === "subject" ? tax.subjects : tax.topics;
  const result = new Map<string, RollupStats>();
  for (const node of nodes) {
    result.set(node.id, rollup(conceptsForScope(tax, level, node.id), byConcept));
  }
  return result;
}

/**
 * The learner's weakest concepts (lowest mastery first), among those with
 * enough evidence to judge — the highest-value things to revise. Returns
 * concept ids; ties break by id for determinism.
 */
export function weakestConcepts(byConcept: Map<string, MasteryState>, limit = 5): string[] {
  return [...byConcept.entries()]
    .filter(([, s]) => s.attempts >= MIN_EVIDENCE)
    .sort((a, b) => a[1].mastery - b[1].mastery || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
}
