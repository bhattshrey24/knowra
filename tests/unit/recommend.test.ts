import { describe, expect, it } from "vitest";
import { recommendAdaptiveDifficulty, recommendDifficulty } from "@/lib/learning/recommend";
import { INITIAL_MASTERY, type MasteryState } from "@/lib/learning/mastery";

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

describe("recommendAdaptiveDifficulty", () => {
  const confident = (mastery: number): MasteryState => ({
    mastery,
    confidence: 1,
    attempts: 50,
    correct: Math.round(mastery * 50),
  });

  it("defaults to the ease-in level with no history", () => {
    expect(recommendAdaptiveDifficulty({})).toBe(2);
  });

  it("nudges up when recent work is easy", () => {
    const base = recommendDifficulty(confident(0.5)); // 3
    expect(recommendAdaptiveDifficulty({ mastery: confident(0.5), recentAccuracy: 0.95 })).toBe(
      base + 1,
    );
  });

  it("nudges down when recent work is hard", () => {
    const base = recommendDifficulty(confident(0.5)); // 3
    expect(recommendAdaptiveDifficulty({ mastery: confident(0.5), recentAccuracy: 0.2 })).toBe(
      base - 1,
    );
  });

  it("caps at 3 while the estimate is uncertain, even acing it", () => {
    const uncertain: MasteryState = { mastery: 0.9, confidence: 0.2, attempts: 2, correct: 2 };
    expect(recommendAdaptiveDifficulty({ mastery: uncertain, recentAccuracy: 1 })).toBe(3);
  });

  it("stays within 1..5", () => {
    expect(
      recommendAdaptiveDifficulty({ mastery: confident(1), recentAccuracy: 1 }),
    ).toBeLessThanOrEqual(5);
    expect(
      recommendAdaptiveDifficulty({ mastery: confident(0), recentAccuracy: 0 }),
    ).toBeGreaterThanOrEqual(1);
  });
});
