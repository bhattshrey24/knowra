/**
 * Builds revision flashcards from a quiz attempt — part of the deterministic,
 * LLM-independent engine. Wrong answers become **weakness** cards (concepts to
 * improve); a capped number of correct answers become **foundational** cards
 * (concepts worth reinforcing). Works for MCQ, multi-select, and written
 * questions. The two types are tagged distinctly (FEATURES.md #4).
 */

import { isAnswerCorrect } from "@/lib/learning/scoring";
import { gradeWritten, isWrittenCorrect } from "@/lib/learning/grade-written";
import type { FlashcardType, QuestionFormat } from "@/types/learning";

export interface QuizAnswerInput {
  prompt: string;
  conceptId?: string;
  format?: QuestionFormat;
  options?: string[];
  selected?: number[];
  correctIndices?: number[];
  explanation?: string;
  referenceAnswer?: string;
  writtenAnswer?: string;
}

export interface BuiltFlashcard {
  type: FlashcardType;
  front: string;
  back: string;
  /** The concept this card revises (Phase 6.2), when the question was tagged. */
  conceptId?: string;
}

function isCorrect(answer: QuizAnswerInput): boolean {
  if (answer.format === "written") {
    return isWrittenCorrect(gradeWritten(answer.referenceAnswer ?? "", answer.writtenAnswer ?? ""));
  }
  return isAnswerCorrect(answer.correctIndices ?? [], answer.selected ?? []);
}

function buildBack(answer: QuizAnswerInput): string {
  const base =
    answer.format === "written"
      ? `Answer: ${answer.referenceAnswer ?? ""}`.trim()
      : `Answer: ${(answer.correctIndices ?? [])
          .map((i) => answer.options?.[i])
          .filter(Boolean)
          .join(", ")}.`;
  return answer.explanation ? `${base} ${answer.explanation}` : base;
}

export function buildFlashcardsFromQuiz(
  answers: QuizAnswerInput[],
  opts: { maxFoundational?: number } = {},
): BuiltFlashcard[] {
  const maxFoundational = opts.maxFoundational ?? 3;
  const cards: BuiltFlashcard[] = [];
  let foundational = 0;

  for (const answer of answers) {
    if (!isCorrect(answer)) {
      cards.push({
        type: "weakness",
        front: answer.prompt,
        back: buildBack(answer),
        conceptId: answer.conceptId,
      });
    } else if (foundational < maxFoundational) {
      cards.push({
        type: "foundational",
        front: answer.prompt,
        back: buildBack(answer),
        conceptId: answer.conceptId,
      });
      foundational += 1;
    }
  }

  return cards;
}

/**
 * Order revision cards so the weakest concepts come first (Phase 6.2): lower
 * mastery earlier. Cards with no concept or no mastery yet sit at a neutral
 * midpoint. Stable, so same-score cards keep their input order.
 */
export function orderByConceptWeakness<T extends { conceptId?: string }>(
  cards: T[],
  masteryByConcept: Map<string, number>,
): T[] {
  const NEUTRAL = 0.5;
  const score = (c: T) =>
    c.conceptId !== undefined ? (masteryByConcept.get(c.conceptId) ?? NEUTRAL) : NEUTRAL;
  return cards
    .map((card, i) => ({ card, i, s: score(card) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.card);
}
