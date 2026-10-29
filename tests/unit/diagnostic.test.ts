import { describe, expect, it } from "vitest";
import { isUncertain, needsDiagnostic, planDiagnostic } from "@/lib/learning/diagnostic";
import type { ConceptCandidate } from "@/lib/learning/concept-selection";
import type { MasteryState } from "@/lib/learning/mastery";

const assessed = (mastery: number, attempts: number): MasteryState => ({
  mastery,
  confidence: Math.min(1, attempts / 20),
  attempts,
  correct: Math.round(mastery * attempts),
});

describe("needsDiagnostic", () => {
  it("is false when there are no concepts", () => {
    expect(needsDiagnostic([])).toBe(false);
  });

  it("is true for a brand-new area (nothing assessed)", () => {
    const candidates: ConceptCandidate[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(needsDiagnostic(candidates)).toBe(true);
  });

  it("is false once at least half the concepts have evidence", () => {
    const candidates: ConceptCandidate[] = [
      { id: "a", state: assessed(0.5, 3) },
      { id: "b", state: assessed(0.5, 3) },
      { id: "c" },
      { id: "d" },
    ];
    expect(needsDiagnostic(candidates)).toBe(false);
  });
});

describe("planDiagnostic", () => {
  const candidates: ConceptCandidate[] = [
    { id: "known", state: assessed(0.8, 4) }, // reliable → skip
    { id: "unseen1" },
    { id: "unseen2" },
    { id: "barely", state: assessed(0.3, 1) }, // not enough evidence → probe
  ];

  it("probes only concepts lacking evidence, reusing reliable data", () => {
    const plan = planDiagnostic(candidates, 5);
    const ids = plan.map((p) => p.conceptId);
    expect(ids).not.toContain("known");
    expect(ids.sort()).toEqual(["barely", "unseen1", "unseen2"]);
  });

  it("varies difficulty to probe level", () => {
    const plan = planDiagnostic(candidates, 5);
    const diffs = new Set(plan.map((p) => p.difficulty));
    expect(diffs.size).toBeGreaterThan(1);
  });

  it("caps at the requested count", () => {
    expect(planDiagnostic(candidates, 2)).toHaveLength(2);
  });
});

describe("isUncertain", () => {
  it("is uncertain without a state or with thin evidence", () => {
    expect(isUncertain(undefined)).toBe(true);
    expect(isUncertain(assessed(0.6, 2))).toBe(true);
  });

  it("is certain once there's enough evidence", () => {
    expect(isUncertain(assessed(0.6, 8))).toBe(false);
  });
});
