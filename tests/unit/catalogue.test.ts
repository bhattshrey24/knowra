import { describe, expect, it } from "vitest";
import { buildCatalogue, rankSearchItems } from "@/lib/taxonomy/catalogue";
import { buildTaxonomy, type TaxonomyInput } from "@/lib/learning/taxonomy";

const input: TaxonomyInput = {
  subjects: [
    { id: "math", name: "Mathematics", description: "Numbers." },
    { id: "sci", name: "Science" },
  ],
  topics: [
    { id: "algebra", subjectId: "math", name: "Algebra" },
    { id: "stats", subjectId: "math", name: "Statistics" },
    { id: "method", subjectId: "sci", name: "Scientific Method" },
  ],
  concepts: [
    { id: "linear-equations", name: "Linear equations", topicIds: ["algebra"] },
    { id: "probability", name: "Probability", topicIds: ["stats", "method"] },
  ],
};

const tax = buildTaxonomy(input);

describe("buildCatalogue", () => {
  const cat = buildCatalogue(tax);

  it("summarises subjects with topic and concept counts", () => {
    const math = cat.subjects.find((s) => s.id === "math");
    expect(math).toMatchObject({ name: "Mathematics", topicCount: 2, conceptCount: 2 });
  });

  it("gives topics their parent subject", () => {
    const algebra = cat.topics.find((t) => t.id === "algebra");
    expect(algebra).toMatchObject({
      subjectId: "math",
      subjectName: "Mathematics",
      conceptCount: 1,
    });
  });

  it("gives concepts their parent topic(s) and subject(s)", () => {
    const prob = cat.concepts.find((c) => c.id === "probability");
    expect(prob?.topics.map((t) => t.id).sort()).toEqual(["method", "stats"]);
    expect(prob?.subjects.map((s) => s.id).sort()).toEqual(["math", "sci"]);
  });

  it("produces a flat search index covering every node", () => {
    expect(cat.searchItems).toHaveLength(2 + 3 + 2);
    const topic = cat.searchItems.find((i) => i.id === "algebra");
    expect(topic).toMatchObject({ level: "topic", subjectId: "math" });
  });
});

describe("rankSearchItems", () => {
  const cat = buildCatalogue(tax);

  it("returns nothing for an empty query", () => {
    expect(rankSearchItems(cat.searchItems, "  ")).toEqual([]);
  });

  it("matches by partial, case-insensitive text", () => {
    const results = rankSearchItems(cat.searchItems, "alg");
    expect(results.map((r) => r.id)).toContain("algebra");
  });

  it("ranks an exact name above a mere substring", () => {
    const results = rankSearchItems(cat.searchItems, "statistics");
    // "Statistics" (exact) should rank before anything that merely contains it.
    expect(results[0].id).toBe("stats");
  });

  it("honours the limit", () => {
    expect(rankSearchItems(cat.searchItems, "a", 2).length).toBeLessThanOrEqual(2);
  });
});
