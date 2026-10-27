/**
 * Deterministic answer scoring. Part of the LLM-independent learning engine:
 * correctness is decided here by comparing the user's selection to the
 * question's correct indices — never by asking a model.
 */

/** True iff the selected indices exactly match the correct set (order-independent). */
export function isAnswerCorrect(correctIndices: number[], selected: number[]): boolean {
  if (correctIndices.length !== selected.length) return false;
  const want = new Set(correctIndices);
  for (const s of selected) {
    if (!want.has(s)) return false;
  }
  return true;
}

export interface GradedItem {
  questionId: string;
  correctIndices: number[];
  selected: number[];
}

export interface GradedResult {
  questionId: string;
  selected: number[];
  correct: boolean;
}

export interface QuizSummary {
  correct: number;
  total: number;
  /** Whole-number percentage 0..100. */
  percent: number;
  results: GradedResult[];
}

/** Grade a whole quiz attempt. No partial credit; empty quiz scores 0%. */
export function scoreQuiz(items: GradedItem[]): QuizSummary {
  const results: GradedResult[] = items.map((item) => ({
    questionId: item.questionId,
    selected: item.selected,
    correct: isAnswerCorrect(item.correctIndices, item.selected),
  }));
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent, results };
}
