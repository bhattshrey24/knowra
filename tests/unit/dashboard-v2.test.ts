import { describe, expect, it } from "vitest";
import {
  accuracyByDifficulty,
  activityHeatmap,
  calculateStreak,
  conceptMasteryDistribution,
  retentionStats,
  type AttemptWithDifficulty,
  type FlashcardRetentionLike,
} from "@/lib/learning/analytics";
import type { MasteryState } from "@/lib/learning/mastery";

describe("accuracyByDifficulty (Phase 7.3)", () => {
  const attempts: AttemptWithDifficulty[] = [
    { domainSlug: "math", difficulty: 1, total: 5, correct: 5, createdAt: "2026-10-01T10:00:00Z" },
    { domainSlug: "math", difficulty: 1, total: 5, correct: 4, createdAt: "2026-10-02T10:00:00Z" },
    { domainSlug: "math", difficulty: 3, total: 6, correct: 3, createdAt: "2026-10-03T10:00:00Z" },
    {
      domainSlug: "science",
      difficulty: 5,
      total: 4,
      correct: 1,
      createdAt: "2026-10-04T10:00:00Z",
    },
  ];

  it("calculates accuracy and question totals for all 5 difficulties", () => {
    const res = accuracyByDifficulty(attempts);
    expect(res).toHaveLength(5);

    const diff1 = res.find((d) => d.difficulty === 1)!;
    expect(diff1.attempts).toBe(2);
    expect(diff1.totalQuestions).toBe(10);
    expect(diff1.correctQuestions).toBe(9);
    expect(diff1.accuracy).toBeCloseTo(0.9, 3);

    const diff2 = res.find((d) => d.difficulty === 2)!;
    expect(diff2.attempts).toBe(0);
    expect(diff2.accuracy).toBe(0);

    const diff3 = res.find((d) => d.difficulty === 3)!;
    expect(diff3.attempts).toBe(1);
    expect(diff3.totalQuestions).toBe(6);
    expect(diff3.correctQuestions).toBe(3);
    expect(diff3.accuracy).toBeCloseTo(0.5, 3);

    const diff5 = res.find((d) => d.difficulty === 5)!;
    expect(diff5.accuracy).toBeCloseTo(0.25, 3);
  });

  it("handles empty attempts without error", () => {
    const res = accuracyByDifficulty([]);
    expect(res).toHaveLength(5);
    expect(res.every((d) => d.attempts === 0 && d.accuracy === 0)).toBe(true);
  });
});

describe("conceptMasteryDistribution (Phase 7.2)", () => {
  const byConcept = new Map<string, MasteryState>([
    ["c1", { mastery: 0.9, confidence: 0.8, attempts: 5, correct: 5 }], // mastered
    ["c2", { mastery: 0.8, confidence: 0.7, attempts: 3, correct: 2 }], // mastered
    ["c3", { mastery: 0.6, confidence: 0.5, attempts: 4, correct: 2 }], // learning
    ["c4", { mastery: 0.3, confidence: 0.4, attempts: 3, correct: 1 }], // weak
    ["c5", { mastery: 0.2, confidence: 0.2, attempts: 1, correct: 0 }], // learning (attempts < MIN_EVIDENCE)
  ]);
  // c6 is not in byConcept -> unassessed

  it("buckets concepts into weak, learning, mastered, unassessed", () => {
    const dist = conceptMasteryDistribution(["c1", "c2", "c3", "c4", "c5", "c6"], byConcept);
    expect(dist.total).toBe(6);
    expect(dist.mastered).toBe(2); // c1, c2
    expect(dist.weak).toBe(1); // c4
    expect(dist.learning).toBe(2); // c3 (mid-mastery), c5 (assessed but < MIN_EVIDENCE)
    expect(dist.unassessed).toBe(1); // c6

    expect(dist.masteredPct).toBeCloseTo(2 / 6, 3);
    expect(dist.weakPct).toBeCloseTo(1 / 6, 3);
    expect(dist.learningPct).toBeCloseTo(2 / 6, 3);
    expect(dist.unassessedPct).toBeCloseTo(1 / 6, 3);
  });

  it("handles empty concept lists gracefully", () => {
    const dist = conceptMasteryDistribution([], byConcept);
    expect(dist.total).toBe(0);
    expect(dist.masteredPct).toBe(0);
  });
});

describe("calculateStreak & activityHeatmap (Phase 7.5)", () => {
  it("calculates active streak correctly", () => {
    // Reference date: 2026-10-10
    const now = new Date("2026-10-10T15:00:00Z");
    const dates = [
      "2026-10-10T08:00:00Z", // today
      "2026-10-09T20:00:00Z", // yesterday
      "2026-10-09T10:00:00Z", // yesterday duplicate
      "2026-10-08T12:00:00Z", // 2 days ago
      "2026-10-05T09:00:00Z", // gap
      "2026-10-04T09:00:00Z",
    ];
    const streak = calculateStreak(dates, now);
    expect(streak.currentStreak).toBe(3); // 10, 9, 8
    expect(streak.longestStreak).toBe(3);
    expect(streak.isActiveToday).toBe(true);
    expect(streak.totalActiveDays).toBe(5);
  });

  it("keeps streak intact if yesterday was active but today is not yet active", () => {
    const now = new Date("2026-10-10T15:00:00Z");
    const dates = ["2026-10-09T10:00:00Z", "2026-10-08T12:00:00Z"];
    const streak = calculateStreak(dates, now);
    expect(streak.currentStreak).toBe(2);
    expect(streak.isActiveToday).toBe(false);
  });

  it("returns 0 for empty activity", () => {
    const streak = calculateStreak([], new Date());
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.isActiveToday).toBe(false);
  });

  it("generates a fixed-length activity heatmap", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const dates = ["2026-10-10T08:00:00Z", "2026-10-10T09:00:00Z", "2026-10-09T10:00:00Z"];
    const map = activityHeatmap(dates, 14, now);
    expect(map).toHaveLength(14);
    const today = map[map.length - 1];
    expect(today.count).toBe(2);
    expect(today.level).toBeGreaterThan(0);
  });
});

describe("retentionStats (Phase 7.4)", () => {
  it("computes cards due now, 7-day distribution, and retention rate", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const flashcards: FlashcardRetentionLike[] = [
      { id: "1", reps: 3, ease: 2.5, intervalDays: 6, dueAt: "2026-10-09T10:00:00Z" }, // due now (yesterday)
      { id: "2", reps: 1, ease: 2.3, intervalDays: 1, dueAt: "2026-10-10T08:00:00Z" }, // due now (earlier today)
      { id: "3", reps: 4, ease: 2.6, intervalDays: 10, dueAt: "2026-10-11T12:00:00Z" }, // due tomorrow (day 1)
      { id: "4", reps: 2, ease: 2.5, intervalDays: 3, dueAt: "2026-10-13T12:00:00Z" }, // due day 3
      { id: "5", reps: 0, ease: 2.5, intervalDays: 0, dueAt: "2026-10-10T00:00:00Z" }, // never reviewed
    ];

    const stats = retentionStats(flashcards, now);
    expect(stats.dueNowCount).toBe(3); // card 1, 2, 5 are <= now
    expect(stats.reviewedCount).toBe(4); // cards 1..4 have reps > 0
    expect(stats.dueNext7Days).toHaveLength(7);
    expect(stats.retentionRate).toBeGreaterThan(0);
  });
});
