import { describe, expect, it } from "vitest";
import {
  INITIAL_MASTERY,
  applyOutcomes,
  masteryOutOfTen,
  updateMastery,
  type MasteryState,
} from "@/lib/learning/mastery";

describe("updateMastery", () => {
  it("increases mastery on a correct answer and counts it", () => {
    const next = updateMastery(INITIAL_MASTERY, { correct: true, difficulty: 3 });
    expect(next.mastery).toBeGreaterThan(0);
    expect(next.attempts).toBe(1);
    expect(next.correct).toBe(1);
  });

  it("keeps mastery within [0, 1]", () => {
    let state = INITIAL_MASTERY;
    for (let i = 0; i < 50; i += 1) state = updateMastery(state, { correct: true, difficulty: 5 });
    expect(state.mastery).toBeLessThanOrEqual(1);
    expect(state.mastery).toBeGreaterThan(0.8);

    for (let i = 0; i < 50; i += 1) state = updateMastery(state, { correct: false, difficulty: 1 });
    expect(state.mastery).toBeGreaterThanOrEqual(0);
    expect(state.mastery).toBeLessThan(0.2);
  });

  it("rewards harder correct answers more than easy ones", () => {
    const hard = updateMastery(INITIAL_MASTERY, { correct: true, difficulty: 5 });
    const easy = updateMastery(INITIAL_MASTERY, { correct: true, difficulty: 1 });
    expect(hard.mastery).toBeGreaterThan(easy.mastery);
  });

  it("grows confidence with attempts and caps at 1", () => {
    let state: MasteryState = INITIAL_MASTERY;
    for (let i = 0; i < 10; i += 1) state = updateMastery(state, { correct: true, difficulty: 2 });
    expect(state.confidence).toBeGreaterThan(0);
    expect(state.confidence).toBeLessThanOrEqual(1);
    for (let i = 0; i < 100; i += 1) state = updateMastery(state, { correct: true, difficulty: 2 });
    expect(state.confidence).toBe(1);
  });
});

describe("applyOutcomes", () => {
  it("folds a whole quiz's outcomes deterministically", () => {
    const outcomes = [
      { correct: true, difficulty: 3 as const },
      { correct: false, difficulty: 3 as const },
      { correct: true, difficulty: 3 as const },
    ];
    const a = applyOutcomes(INITIAL_MASTERY, outcomes);
    const b = applyOutcomes(INITIAL_MASTERY, outcomes);
    expect(a).toEqual(b);
    expect(a.attempts).toBe(3);
    expect(a.correct).toBe(2);
  });
});

describe("masteryOutOfTen", () => {
  it("maps 0..1 mastery to a 0..10 score", () => {
    expect(masteryOutOfTen({ ...INITIAL_MASTERY, mastery: 0 })).toBe(0);
    expect(masteryOutOfTen({ ...INITIAL_MASTERY, mastery: 0.42 })).toBe(4);
    expect(masteryOutOfTen({ ...INITIAL_MASTERY, mastery: 1 })).toBe(10);
  });
});
