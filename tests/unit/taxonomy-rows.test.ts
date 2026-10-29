import { describe, expect, it } from "vitest";
import { rowsToTaxonomy, taxonomyToRows } from "@/lib/taxonomy/rows";
import { SEED_TAXONOMY } from "@/lib/taxonomy/seed";
import type { TaxonomyInput } from "@/lib/learning/taxonomy";

const sample: TaxonomyInput = {
  subjects: [{ id: "math", name: "Mathematics", description: "Numbers." }],
  topics: [
    { id: "algebra", subjectId: "math", name: "Algebra" },
    { id: "stats", subjectId: "math", name: "Statistics" },
  ],
  concepts: [
    { id: "linear-equations", name: "Linear equations", topicIds: ["algebra"] },
    { id: "probability", name: "Probability", topicIds: ["stats", "algebra"] },
  ],
};

describe("taxonomyToRows", () => {
  it("maps nodes to DB row shapes with snake_case columns", () => {
    const rows = taxonomyToRows(sample);
    expect(rows.subjects).toEqual([{ id: "math", name: "Mathematics", description: "Numbers." }]);
    expect(rows.topics[0]).toEqual({ id: "algebra", subject_id: "math", name: "Algebra" });
    expect(rows.concepts[0]).toEqual({
      id: "linear-equations",
      name: "Linear equations",
      foundational_weight: null,
    });
  });

  it("emits one join row per concept-topic link", () => {
    const rows = taxonomyToRows(sample);
    expect(rows.conceptTopics).toEqual([
      { concept_id: "linear-equations", topic_id: "algebra" },
      { concept_id: "probability", topic_id: "stats" },
      { concept_id: "probability", topic_id: "algebra" },
    ]);
  });

  it("emits a join row for every link in the seed", () => {
    const rows = taxonomyToRows(SEED_TAXONOMY);
    const expected = SEED_TAXONOMY.concepts.reduce((n, c) => n + c.topicIds.length, 0);
    expect(rows.conceptTopics).toHaveLength(expected);
  });
});

describe("rowsToTaxonomy", () => {
  it("round-trips the sample taxonomy", () => {
    expect(rowsToTaxonomy(taxonomyToRows(sample))).toEqual(sample);
  });

  it("round-trips the full seed", () => {
    expect(rowsToTaxonomy(taxonomyToRows(SEED_TAXONOMY))).toEqual(SEED_TAXONOMY);
  });
});
