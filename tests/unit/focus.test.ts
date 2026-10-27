import { describe, expect, it } from "vitest";
import { focusAreas, needsFoundationalWork, type SubjectMastery } from "@/lib/learning/focus";

const subjects: SubjectMastery[] = [
  { slug: "mathematics", mastery: 0.2, confidence: 0.6, attempts: 10 }, // weak
  { slug: "science", mastery: 0.9, confidence: 0.9, attempts: 20 }, // strong (not a focus)
  { slug: "history", mastery: 0.55, confidence: 0.3, attempts: 5 }, // shaky
  { slug: "music", mastery: 0.5, confidence: 0.8, attempts: 0 }, // no attempts (ignored)
];

describe("focusAreas", () => {
  it("prioritises the weakest engaged subjects and excludes strong/untouched ones", () => {
    const areas = focusAreas(subjects);
    const slugs = areas.map((a) => a.slug);
    expect(slugs).toContain("mathematics");
    expect(slugs).toContain("history");
    expect(slugs).not.toContain("science"); // mastered
    expect(slugs).not.toContain("music"); // no attempts
    expect(slugs[0]).toBe("mathematics"); // weakest first
  });

  it("labels the weakest as 'weak' and respects the limit", () => {
    const areas = focusAreas(subjects, 1);
    expect(areas).toHaveLength(1);
    expect(areas[0].reason).toBe("weak");
  });

  it("returns nothing when everything is strong", () => {
    expect(focusAreas([{ slug: "a", mastery: 0.95, confidence: 1, attempts: 30 }])).toEqual([]);
  });
});

describe("needsFoundationalWork", () => {
  it("flags low mastery with enough attempts", () => {
    expect(needsFoundationalWork({ slug: "x", mastery: 0.3, confidence: 0.5, attempts: 5 })).toBe(
      true,
    );
  });
  it("does not flag early on or when mastery is decent", () => {
    expect(needsFoundationalWork({ slug: "x", mastery: 0.3, confidence: 0.2, attempts: 1 })).toBe(
      false,
    );
    expect(needsFoundationalWork({ slug: "x", mastery: 0.7, confidence: 0.9, attempts: 10 })).toBe(
      false,
    );
  });
});
