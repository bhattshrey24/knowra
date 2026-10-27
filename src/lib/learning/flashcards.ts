/**
 * Builds revision flashcards from a quiz attempt — part of the deterministic,
 * LLM-independent engine. Wrong answers become **weakness** cards (concepts to
 * improve); a capped number of correct answers become **foundational** cards
 * (concepts worth reinforcing, including ones the learner already knows). The
 * two types are tagged distinctly (FEATURES.md #4).
 */

import { isAnswerCorrect } from "@/lib/learning/scoring";
import type { FlashcardType } from "@/types/learning";

export interface QuizAnswerInput {
  prompt: string;
  options: string[];
  selected: number[];
  correctIndices: number[];
  explanation?: string;
}

export interface BuiltFlashcard {
  type: FlashcardType;
  front: string;
  back: string;
}

function buildBack(answer: QuizAnswerInput): string {
  const correctText = answer.correctIndices
    .map((i) => answer.options[i])
    .filter(Boolean)
    .join(", ");
  const base = `Answer: ${correctText}.`;
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
    if (!isAnswerCorrect(answer.correctIndices, answer.selected)) {
      cards.push({ type: "weakness", front: answer.prompt, back: buildBack(answer) });
    } else if (foundational < maxFoundational) {
      cards.push({ type: "foundational", front: answer.prompt, back: buildBack(answer) });
      foundational += 1;
    }
  }

  return cards;
}
