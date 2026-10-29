import { describe, expect, it } from "vitest";
import { buildFlashcardCatalogue, type FlashCardInput } from "@/lib/flashcards/catalogue";
import { buildTaxonomy, type TaxonomyInput } from "@/lib/learning/taxonomy";
import type { FlashcardType } from "@/types/learning";

const taxInput: TaxonomyInput = {
  subjects: [{ id: "math", name: "Mathematics" }],
  topics: [
    { id: "algebra", subjectId: "math", name: "Algebra" },
    { id: "stats", subjectId: "math", name: "Statistics" },
  ],
  concepts: [
    { id: "linear", name: "Linear equations", topicIds: ["algebra"] },
    { id: "probability", name: "Probability", topicIds: ["stats", "algebra"] },
  ],
};
const tax = buildTaxonomy(taxInput);

const card = (
  id: string,
  conceptId: string | null,
  due: boolean,
  type: FlashcardType = "weakness",
): FlashCardInput => ({
  id,
  domainSlug: "math",
  subjectName: "Mathematics",
  conceptId,
  type,
  front: `front-${id}`,
  back: `back-${id}`,
  due,
});

describe("buildFlashcardCatalogue", () => {
  const cards = [
    card("1", "linear", true),
    card("2", "linear", false),
    card("3", "probability", true),
    card("4", null, false), // untagged custom card
  ];
  const cat = buildFlashcardCatalogue(cards, tax);

  it("groups by subject with total and due counts", () => {
    expect(cat.subjects).toHaveLength(1);
    expect(cat.subjects[0]).toMatchObject({ id: "math", name: "Mathematics", total: 4, due: 2 });
  });

  it("groups by concept, skipping untagged cards", () => {
    const linear = cat.concepts.find((c) => c.id === "linear");
    expect(linear).toMatchObject({ total: 2, due: 1, parentLabel: "Mathematics · Algebra" });
    // card 4 (no concept) isn't in any concept group
    expect(cat.concepts.reduce((n, c) => n + c.total, 0)).toBe(3);
  });

  it("puts a shared concept's cards under each of its topics", () => {
    const algebra = cat.topics.find((t) => t.id === "algebra");
    const stats = cat.topics.find((t) => t.id === "stats");
    // algebra has linear (2) + probability (1) = 3; stats has probability (1)
    expect(algebra?.total).toBe(3);
    expect(stats?.total).toBe(1);
    expect(algebra?.parentLabel).toBe("Mathematics");
  });

  it("orders groups by due first", () => {
    const multi = buildFlashcardCatalogue(
      [card("a", "linear", false), card("b", "probability", true)],
      tax,
    );
    // probability group (1 due) should sort before linear (0 due)
    expect(multi.concepts[0].id).toBe("probability");
  });
});
