import { describe, expect, it } from "vitest";
import { gradeWritten, isWrittenCorrect } from "@/lib/learning/grade-written";

describe("gradeWritten", () => {
  const reference = "Chloroplasts absorb sunlight to convert carbon dioxide and water into glucose";

  it("scores a thorough answer highly", () => {
    const score = gradeWritten(
      reference,
      "Chloroplasts use sunlight to turn carbon dioxide and water into glucose",
    );
    expect(score).toBeGreaterThan(0.7);
  });

  it("scores an empty or stopword-only answer at zero", () => {
    expect(gradeWritten(reference, "")).toBe(0);
    expect(gradeWritten(reference, "the and of to")).toBe(0);
  });

  it("gives partial credit for partial overlap", () => {
    const score = gradeWritten(reference, "sunlight and water");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.7);
  });

  it("stays within 0..1", () => {
    const score = gradeWritten(reference, reference + " " + reference);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("isWrittenCorrect", () => {
  it("uses a 0.5 threshold by default", () => {
    expect(isWrittenCorrect(0.6)).toBe(true);
    expect(isWrittenCorrect(0.4)).toBe(false);
  });
});
