import { describe, expect, it } from "vitest";
import {
  buildTaxonomy,
  conceptsForScope,
  conceptsOfTopic,
  subjectsOfConcept,
  topicsOfSubject,
  validateTaxonomy,
  type TaxonomyInput,
} from "@/lib/learning/taxonomy";

/** A small, valid taxonomy with one concept shared across two subjects. */
const valid: TaxonomyInput = {
  subjects: [
    { id: "math", name: "Mathematics" },
    { id: "sci", name: "Science" },
  ],
  topics: [
    { id: "algebra", subjectId: "math", name: "Algebra" },
    { id: "stats", subjectId: "math", name: "Statistics" },
    { id: "method", subjectId: "sci", name: "Scientific Method" },
  ],
  concepts: [
    { id: "linear-equations", name: "Linear equations", topicIds: ["algebra"] },
    { id: "quadratics", name: "Quadratics", topicIds: ["algebra"] },
    // Shared across a math topic and a science topic — no duplication.
    { id: "probability", name: "Probability", topicIds: ["stats", "method"] },
  ],
};

describe("validateTaxonomy", () => {
  it("accepts a structurally sound taxonomy", () => {
    expect(validateTaxonomy(valid)).toEqual([]);
  });

  it("flags a topic whose subject does not exist", () => {
    const issues = validateTaxonomy({
      ...valid,
      topics: [...valid.topics, { id: "orphan", subjectId: "nope", name: "Orphan" }],
    });
    expect(issues.some((i) => i.level === "topic" && i.id === "orphan")).toBe(true);
  });

  it("flags a concept referencing a missing topic", () => {
    const issues = validateTaxonomy({
      ...valid,
      concepts: [...valid.concepts, { id: "ghost", name: "Ghost", topicIds: ["missing"] }],
    });
    expect(issues.some((i) => i.level === "concept" && i.id === "ghost")).toBe(true);
  });

  it("flags a concept with no topics", () => {
    const issues = validateTaxonomy({
      ...valid,
      concepts: [...valid.concepts, { id: "floating", name: "Floating", topicIds: [] }],
    });
    expect(issues.some((i) => i.id === "floating")).toBe(true);
  });

  it("flags duplicate ids within a level", () => {
    const issues = validateTaxonomy({
      ...valid,
      subjects: [...valid.subjects, { id: "math", name: "Math (dup)" }],
    });
    expect(issues.some((i) => i.level === "subject" && i.id === "math")).toBe(true);
  });
});

describe("buildTaxonomy", () => {
  it("throws on an invalid taxonomy", () => {
    expect(() =>
      buildTaxonomy({ ...valid, topics: [{ id: "x", subjectId: "nope", name: "X" }] }),
    ).toThrow();
  });

  it("indexes nodes by id", () => {
    const tax = buildTaxonomy(valid);
    expect(tax.subjectById.get("math")?.name).toBe("Mathematics");
    expect(tax.conceptById.get("probability")?.topicIds).toEqual(["stats", "method"]);
  });
});

describe("conceptsForScope", () => {
  const tax = buildTaxonomy(valid);

  it("resolves a concept scope to just that concept", () => {
    expect(conceptsForScope(tax, "concept", "quadratics")).toEqual(["quadratics"]);
  });

  it("resolves a topic scope to its concepts", () => {
    expect(conceptsForScope(tax, "topic", "algebra").sort()).toEqual([
      "linear-equations",
      "quadratics",
    ]);
  });

  it("resolves a subject scope to every concept under its topics", () => {
    expect(conceptsForScope(tax, "subject", "math").sort()).toEqual([
      "linear-equations",
      "probability",
      "quadratics",
    ]);
  });

  it("includes a shared concept under both subjects", () => {
    expect(conceptsForScope(tax, "subject", "sci")).toContain("probability");
  });

  it("returns an empty list for an unknown id", () => {
    expect(conceptsForScope(tax, "subject", "unknown")).toEqual([]);
  });
});

describe("relationship helpers", () => {
  const tax = buildTaxonomy(valid);

  it("lists topics of a subject", () => {
    expect(
      topicsOfSubject(tax, "math")
        .map((t) => t.id)
        .sort(),
    ).toEqual(["algebra", "stats"]);
  });

  it("lists concepts of a topic", () => {
    expect(conceptsOfTopic(tax, "stats").map((c) => c.id)).toEqual(["probability"]);
  });

  it("resolves the subjects a shared concept belongs to", () => {
    expect(subjectsOfConcept(tax, "probability").sort()).toEqual(["math", "sci"]);
  });
});
