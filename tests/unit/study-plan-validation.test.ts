import { describe, expect, it } from "vitest";
import { parseStudyPlan } from "@/lib/validation/study-plan";

const allowed = new Map([
  ["fractions", "Fractions"],
  ["algebra", "Algebra"],
]);

describe("parseStudyPlan guardrail", () => {
  it("accepts a valid plan and uses our authoritative concept name", () => {
    const res = parseStudyPlan(
      {
        overview: "Focus on fractions.",
        steps: [{ conceptId: "fractions", action: "learn", reason: "New to you." }],
        encouragement: "You've got this.",
      },
      allowed,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.steps).toHaveLength(1);
      expect(res.data.steps[0].conceptName).toBe("Fractions"); // from our map, not the model
    }
  });

  it("drops steps that reference concepts the engine did not select", () => {
    const res = parseStudyPlan(
      {
        overview: "Plan",
        steps: [
          { conceptId: "fractions", action: "learn", reason: "ok" },
          { conceptId: "quantum-gravity", action: "learn", reason: "invented!" },
        ],
      },
      allowed,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.steps.map((s) => s.conceptId)).toEqual(["fractions"]);
    }
  });

  it("dedups repeated concepts", () => {
    const res = parseStudyPlan(
      {
        overview: "Plan",
        steps: [
          { conceptId: "fractions", action: "learn", reason: "a" },
          { conceptId: "fractions", action: "review", reason: "b" },
        ],
      },
      allowed,
    );
    expect(res.success && res.data.steps).toHaveLength(1);
  });

  it("fails when nothing references an allowed concept", () => {
    const res = parseStudyPlan(
      { overview: "Plan", steps: [{ conceptId: "nope", action: "learn", reason: "x" }] },
      allowed,
    );
    expect(res.success).toBe(false);
  });

  it("fails on an invalid shape", () => {
    expect(parseStudyPlan({ steps: [] }, allowed).success).toBe(false);
    expect(parseStudyPlan({ overview: "x", steps: "not-an-array" }, allowed).success).toBe(false);
  });
});
