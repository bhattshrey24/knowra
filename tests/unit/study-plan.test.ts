import { describe, expect, it } from "vitest";
import {
  actionForStatus,
  buildStudyFocus,
  fallbackStudyPlan,
  type StudyCandidate,
} from "@/lib/learning/study-plan";
import type { MasteryState } from "@/lib/learning/mastery";

const weak: MasteryState = { mastery: 0.2, confidence: 0.8, attempts: 5, correct: 1 };
const strong: MasteryState = { mastery: 0.9, confidence: 0.9, attempts: 6, correct: 5 };

const candidates: StudyCandidate[] = [
  { conceptId: "c-weak", conceptName: "Weak", state: weak },
  { conceptId: "c-new", conceptName: "New" }, // unassessed
  { conceptId: "c-due", conceptName: "Due", state: strong, dueCount: 2 },
  { conceptId: "c-strong", conceptName: "Strong", state: strong, lastSeenDaysAgo: 1 },
];

describe("actionForStatus", () => {
  it("maps status to the implied action", () => {
    expect(actionForStatus("weak")).toBe("strengthen");
    expect(actionForStatus("unassessed")).toBe("learn");
    expect(actionForStatus("due")).toBe("review");
    expect(actionForStatus("strong")).toBe("review");
  });
});

describe("buildStudyFocus", () => {
  it("puts due-for-review concepts first", () => {
    const focus = buildStudyFocus(candidates, 5);
    expect(focus[0]).toMatchObject({ conceptId: "c-due", status: "due", dueCount: 2 });
  });

  it("classifies weak and unassessed concepts", () => {
    const focus = buildStudyFocus(candidates, 5);
    const byId = new Map(focus.map((f) => [f.conceptId, f]));
    expect(byId.get("c-weak")?.status).toBe("weak");
    expect(byId.get("c-new")?.status).toBe("unassessed");
  });

  it("respects the max and never duplicates a concept", () => {
    const focus = buildStudyFocus(candidates, 2);
    expect(focus).toHaveLength(2);
    expect(focus[0].conceptId).toBe("c-due");
    expect(new Set(focus.map((f) => f.conceptId)).size).toBe(focus.length);
  });

  it("returns empty for no candidates or max 0", () => {
    expect(buildStudyFocus([], 5)).toHaveLength(0);
    expect(buildStudyFocus(candidates, 0)).toHaveLength(0);
  });

  it("is deterministic", () => {
    expect(buildStudyFocus(candidates, 3)).toEqual(buildStudyFocus(candidates, 3));
  });
});

describe("fallbackStudyPlan", () => {
  it("builds one step per focus item with the implied action", () => {
    const focus = buildStudyFocus(candidates, 4);
    const plan = fallbackStudyPlan("Mathematics", focus);
    expect(plan.overview).toContain("Mathematics");
    expect(plan.steps).toHaveLength(focus.length);
    for (const step of plan.steps) {
      const item = focus.find((f) => f.conceptId === step.conceptId)!;
      expect(step.action).toBe(actionForStatus(item.status));
      expect(step.reason.length).toBeGreaterThan(0);
      expect(step.conceptName).toBe(item.conceptName);
    }
    expect(plan.encouragement).toBeTruthy();
  });

  it("gives an 'all caught up' plan when there is no focus", () => {
    const plan = fallbackStudyPlan("Mathematics", []);
    expect(plan.steps).toHaveLength(0);
    expect(plan.overview).toMatch(/caught up|start a quiz/i);
  });
});
