import { describe, expect, it } from "vitest";
import {
  accuracyTimeline,
  domainGains,
  overallStats,
  type AttemptLike,
} from "@/lib/learning/analytics";

const attempts: AttemptLike[] = [
  { domainSlug: "mathematics", total: 5, correct: 2, createdAt: "2026-10-01T10:00:00Z" },
  { domainSlug: "mathematics", total: 5, correct: 4, createdAt: "2026-10-03T10:00:00Z" },
  { domainSlug: "science", total: 4, correct: 4, createdAt: "2026-10-02T10:00:00Z" },
];

describe("overallStats", () => {
  it("aggregates attempts, answers, and accuracy", () => {
    const s = overallStats(attempts);
    expect(s.totalAttempts).toBe(3);
    expect(s.totalAnswered).toBe(14);
    expect(s.totalCorrect).toBe(10);
    expect(s.accuracy).toBeCloseTo(10 / 14, 3);
  });

  it("handles an empty history without dividing by zero", () => {
    expect(overallStats([])).toMatchObject({ totalAttempts: 0, totalAnswered: 0, accuracy: 0 });
  });
});

describe("accuracyTimeline", () => {
  it("returns points in chronological order with per-attempt accuracy", () => {
    const points = accuracyTimeline(attempts);
    expect(points.map((p) => p.createdAt)).toEqual([
      "2026-10-01T10:00:00Z",
      "2026-10-02T10:00:00Z",
      "2026-10-03T10:00:00Z",
    ]);
    expect(points[0].accuracy).toBeCloseTo(0.4, 3);
    expect(points[2].accuracy).toBeCloseTo(0.8, 3);
    expect(points.map((p) => p.index)).toEqual([0, 1, 2]);
  });
});

describe("domainGains", () => {
  it("computes baseline vs latest accuracy and the gain per domain", () => {
    const gains = domainGains(attempts);
    const math = gains.find((g) => g.domainSlug === "mathematics")!;
    expect(math.baselineAccuracy).toBeCloseTo(0.4, 3);
    expect(math.latestAccuracy).toBeCloseTo(0.8, 3);
    expect(math.gain).toBeCloseTo(0.4, 3);
    expect(math.attempts).toBe(2);

    const science = gains.find((g) => g.domainSlug === "science")!;
    expect(science.gain).toBeCloseTo(0, 3); // single attempt → baseline == latest
  });
});
