import { describe, expect, it } from "vitest";
import { recommendDifficulty } from "@/lib/learning/recommend";
import { INITIAL_MASTERY } from "@/lib/learning/mastery";

describe("recommendDifficulty", () => {
  it("eases beginners in when there's no history", () => {
    expect(recommendDifficulty(INITIAL_MASTERY)).toBe(2);
  });

  it("recommends harder quizzes as mastery rises (confident learner)", () => {
    const low = recommendDifficulty({ mastery: 0.1, confidence: 0.9, attempts: 30, correct: 3 });
    const mid = recommendDifficulty({ mastery: 0.5, confidence: 0.9, attempts: 30, correct: 15 });
    const high = recommendDifficulty({ mastery: 0.9, confidence: 0.9, attempts: 30, correct: 27 });
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(high).toBe(5);
    expect(low).toBe(1);
  });

  it("holds back the hardest levels until confidence is established (progressive load)", () => {
    const strongButUnsure = recommendDifficulty({
      mastery: 0.9,
      confidence: 0.2,
      attempts: 3,
      correct: 3,
    });
    expect(strongButUnsure).toBeLessThanOrEqual(3);
  });

  it("always returns a value in 1..5", () => {
    for (const m of [0, 0.25, 0.5, 0.75, 1]) {
      const d = recommendDifficulty({ mastery: m, confidence: 1, attempts: 50, correct: 25 });
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
    }
  });
});
