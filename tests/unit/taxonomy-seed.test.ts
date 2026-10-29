import { describe, expect, it } from "vitest";
import { SEED_TAXONOMY } from "@/lib/taxonomy/seed";
import { buildTaxonomy, conceptsForScope, validateTaxonomy } from "@/lib/learning/taxonomy";
import { DOMAINS } from "@/lib/domains";

describe("SEED_TAXONOMY", () => {
  it("is structurally valid", () => {
    expect(validateTaxonomy(SEED_TAXONOMY)).toEqual([]);
  });

  it("has one subject per predefined domain (the bridge to the flat flow)", () => {
    const subjectIds = SEED_TAXONOMY.subjects.map((s) => s.id).sort();
    const domainSlugs = DOMAINS.map((d) => d.slug).sort();
    expect(subjectIds).toEqual(domainSlugs);
  });

  it("has a broad catalogue (20+ subjects)", () => {
    expect(SEED_TAXONOMY.subjects.length).toBeGreaterThanOrEqual(20);
  });

  it("gives every subject at least one topic", () => {
    const withTopics = new Set(SEED_TAXONOMY.topics.map((t) => t.subjectId));
    for (const subject of SEED_TAXONOMY.subjects) {
      expect(withTopics.has(subject.id)).toBe(true);
    }
  });

  it("gives every topic at least one concept", () => {
    const tax = buildTaxonomy(SEED_TAXONOMY);
    for (const topic of SEED_TAXONOMY.topics) {
      expect(conceptsForScope(tax, "topic", topic.id).length).toBeGreaterThan(0);
    }
  });

  it("includes at least one concept shared across subjects (no duplication)", () => {
    const shared = SEED_TAXONOMY.concepts.filter((c) => c.topicIds.length > 1);
    expect(shared.length).toBeGreaterThan(0);
  });

  it("resolves a subject scope to all of its concepts", () => {
    const tax = buildTaxonomy(SEED_TAXONOMY);
    // Mathematics has concepts across five topics; expect a healthy set.
    expect(conceptsForScope(tax, "subject", "mathematics").length).toBeGreaterThanOrEqual(10);
  });
});
