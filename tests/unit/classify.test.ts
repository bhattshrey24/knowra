import { describe, expect, it } from "vitest";
import { resolveClassification, slugify } from "@/lib/learning/classify";
import { buildTaxonomy, type TaxonomyInput } from "@/lib/learning/taxonomy";

const input: TaxonomyInput = {
  subjects: [{ id: "computer-science", name: "Computer Science" }],
  topics: [{ id: "programming", subjectId: "computer-science", name: "Programming" }],
  concepts: [{ id: "recursion", name: "Recursion", topicIds: ["programming"] }],
};
const tax = buildTaxonomy(input);

describe("slugify", () => {
  it("makes a clean kebab id", () => {
    expect(slugify("  Python Decorators! ")).toBe("python-decorators");
  });
});

describe("resolveClassification", () => {
  it("reuses existing subject/topic and marks a genuinely new concept", () => {
    const r = resolveClassification(
      { subject: "computer science", topic: "Programming", concept: "Decorators" },
      tax,
    );
    expect(r.subject).toMatchObject({ id: "computer-science", isNew: false });
    expect(r.topic).toMatchObject({ id: "programming", isNew: false });
    expect(r.concept).toMatchObject({ id: "decorators", isNew: true });
    expect(r.duplicate).toBe(false);
  });

  it("marks everything new for an unknown subject", () => {
    const r = resolveClassification(
      { subject: "Astrophysics", topic: "Stellar physics", concept: "Neutron stars" },
      tax,
    );
    expect(r.subject).toMatchObject({ id: "astrophysics", isNew: true });
    expect(r.topic.isNew).toBe(true);
    expect(r.concept.isNew).toBe(true);
  });

  it("flags a duplicate when the concept already sits under that topic", () => {
    const r = resolveClassification(
      { subject: "Computer Science", topic: "Programming", concept: "recursion" },
      tax,
    );
    expect(r.concept).toMatchObject({ id: "recursion", isNew: false });
    expect(r.duplicate).toBe(true);
  });

  it("gives a new node a non-colliding slug", () => {
    // "Recursion?" doesn't match "Recursion" by name, but slugifies to the same
    // taken id — so it must get a suffixed, unique slug.
    const r = resolveClassification(
      { subject: "Computer Science", topic: "Programming", concept: "Recursion?" },
      tax,
    );
    expect(r.concept.isNew).toBe(true);
    expect(r.concept.id).toBe("recursion-2");
  });
});
