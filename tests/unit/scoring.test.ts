import { describe, expect, it } from "vitest";
import { isAnswerCorrect, scoreQuiz } from "@/lib/learning/scoring";

describe("isAnswerCorrect", () => {
  it("matches a single correct choice (mcq)", () => {
    expect(isAnswerCorrect([2], [2])).toBe(true);
    expect(isAnswerCorrect([2], [1])).toBe(false);
  });

  it("is order-independent for multi-select", () => {
    expect(isAnswerCorrect([0, 2], [2, 0])).toBe(true);
  });

  it("requires the full set for multi-select (no partial credit)", () => {
    expect(isAnswerCorrect([0, 2], [0])).toBe(false);
    expect(isAnswerCorrect([0, 2], [0, 1, 2])).toBe(false);
  });

  it("treats an empty selection as incorrect when an answer exists", () => {
    expect(isAnswerCorrect([1], [])).toBe(false);
  });
});

describe("scoreQuiz", () => {
  it("summarises correct/total/percent and per-question results", () => {
    const summary = scoreQuiz([
      { questionId: "q1", correctIndices: [0], selected: [0] },
      { questionId: "q2", correctIndices: [1], selected: [2] },
      { questionId: "q3", correctIndices: [0, 1], selected: [1, 0] },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.correct).toBe(2);
    expect(summary.percent).toBe(67);
    expect(summary.results.map((r) => r.correct)).toEqual([true, false, true]);
  });

  it("handles an empty quiz without dividing by zero", () => {
    const summary = scoreQuiz([]);
    expect(summary).toMatchObject({ correct: 0, total: 0, percent: 0 });
  });
});
