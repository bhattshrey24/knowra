/**
 * Deterministic selection over the curated question bank (Phase 6.4 support).
 * LLM-independent: given a set of concepts, a target difficulty, the allowed
 * formats and a count, it returns curated questions for *exactly* those
 * concepts — never unrelated ones. Used as the reliable fallback when live LLM
 * generation fails; the quiz route reports "temporarily unavailable" when this
 * returns nothing.
 */

import type { Difficulty, Question, QuestionFormat } from "@/types/learning";
import { CURATED_QUESTIONS, type CuratedQuestion } from "@/lib/learning/question-bank-data";

/** A curated question resolved to the final shape, minus the per-attempt id. */
export type CuratedResult = Omit<Question, "id">;

// Index by conceptId once at module load. Order within a concept is preserved.
const byConcept = new Map<string, CuratedQuestion[]>();
for (const q of CURATED_QUESTIONS) {
  const list = byConcept.get(q.conceptId);
  if (list) list.push(q);
  else byConcept.set(q.conceptId, [q]);
}

/** Whether the bank has any curated question for any of the given concepts. */
export function hasCurated(conceptIds: readonly string[]): boolean {
  return conceptIds.some((id) => byConcept.has(id));
}

function toResult(q: CuratedQuestion): CuratedResult {
  return {
    conceptId: q.conceptId,
    difficulty: q.difficulty,
    format: q.format,
    prompt: q.prompt,
    options: q.options,
    correctIndices: q.correctIndices,
    referenceAnswer: q.referenceAnswer,
    explanation: q.explanation,
  };
}

/** Rank by closeness to the target difficulty (nearer first), stable otherwise. */
function byDifficultyCloseness(target: Difficulty) {
  return (a: CuratedQuestion, b: CuratedQuestion) =>
    Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target);
}

/**
 * Select up to `count` curated questions for `conceptIds`, preferring the
 * requested `difficulty` (widening to nearby levels only when needed) and the
 * requested `formats`. Round-robins across concepts so a multi-concept scope
 * gets variety. Deterministic: same inputs → same output, same order.
 */
export function curatedQuiz(
  conceptIds: readonly string[],
  difficulty: Difficulty,
  formats: readonly QuestionFormat[],
  count: number,
): CuratedResult[] {
  const allowFormat = new Set(formats.length ? formats : (["mcq"] as QuestionFormat[]));

  // Per-concept queues, each ordered by difficulty closeness to the target.
  const queues: CuratedQuestion[][] = [];
  for (const id of conceptIds) {
    const list = (byConcept.get(id) ?? []).filter((q) => allowFormat.has(q.format));
    if (list.length) queues.push([...list].sort(byDifficultyCloseness(difficulty)));
  }

  // Round-robin draw so questions spread across the available concepts.
  const out: CuratedResult[] = [];
  let drew = true;
  while (out.length < count && drew) {
    drew = false;
    for (const queue of queues) {
      if (out.length >= count) break;
      const next = queue.shift();
      if (next) {
        out.push(toResult(next));
        drew = true;
      }
    }
  }
  return out;
}
