import { describe, expect, it } from "vitest";
import {
  aggregateByLevel,
  foldConceptMastery,
  weakestConcepts,
  type ConceptOutcome,
} from "@/lib/learning/aggregate";
import { INITIAL_MASTERY, updateMastery, type MasteryState } from "@/lib/learning/mastery";
import { buildTaxonomy, type TaxonomyInput } from "@/lib/learning/taxonomy";

const input: TaxonomyInput = {
  subjects: [{ id: "math", name: "Mathematics" }],
  topics: [
    { id: "algebra", subjectId: "math", name: "Algebra" },
    { id: "stats", subjectId: "math", name: "Statistics" },
  ],
  concepts: [
    { id: "linear", name: "Linear equations", topicIds: ["algebra"] },
    { id: "quadratic", name: "Quadratics", topicIds: ["algebra"] },
    { id: "probability", name: "Probability", topicIds: ["stats"] },
  ],
};
const tax = buildTaxonomy(input);

describe("foldConceptMastery", () => {
  it("updates per-concept mastery from a quiz's outcomes, grouped by concept", () => {
    const outcomes: ConceptOutcome[] = [
      { conceptId: "linear", correct: true, difficulty: 3 },
      { conceptId: "linear", correct: true, difficulty: 3 },
      { conceptId: "quadratic", correct: false, difficulty: 2 },
    ];
    const next = foldConceptMastery(new Map(), outcomes);
    expect(next.get("linear")?.attempts).toBe(2);
    expect(next.get("linear")?.correct).toBe(2);
    expect(next.get("quadratic")?.attempts).toBe(1);
    expect(next.get("linear")?.mastery).toBeGreaterThan(0);
  });

  it("builds on existing state rather than resetting it", () => {
    const prev = new Map<string, MasteryState>([
      ["linear", updateMastery(INITIAL_MASTERY, { correct: true, difficulty: 3 })],
    ]);
    const next = foldConceptMastery(prev, [{ conceptId: "linear", correct: true, difficulty: 3 }]);
    expect(next.get("linear")?.attempts).toBe(2);
  });
});

describe("aggregateByLevel", () => {
  // linear mastered, quadratic weak, probability unassessed.
  const byConcept = new Map<string, MasteryState>([
    ["linear", { mastery: 0.8, confidence: 0.5, attempts: 4, correct: 4 }],
    ["quadratic", { mastery: 0.2, confidence: 0.3, attempts: 2, correct: 0 }],
  ]);

  it("rolls concept mastery up to each topic", () => {
    const byTopic = aggregateByLevel(byConcept, tax, "topic");
    const algebra = byTopic.get("algebra");
    expect(algebra?.conceptsTotal).toBe(2);
    expect(algebra?.conceptsAssessed).toBe(2);
    expect(algebra?.attempts).toBe(6);
    // attempts-weighted mean: (0.8*4 + 0.2*2) / 6 = 0.6
    expect(algebra?.mastery).toBeCloseTo(0.6, 5);
  });

  it("reports coverage, leaving unassessed concepts out of the mean", () => {
    const bySubject = aggregateByLevel(byConcept, tax, "subject");
    const math = bySubject.get("math");
    expect(math?.conceptsTotal).toBe(3);
    expect(math?.conceptsAssessed).toBe(2); // probability is unassessed
    expect(math?.coverage).toBeCloseTo(2 / 3, 5);
  });

  it("yields zeroed stats for a subject with no assessed concepts", () => {
    const bySubject = aggregateByLevel(new Map(), tax, "subject");
    const math = bySubject.get("math");
    expect(math).toMatchObject({ mastery: 0, attempts: 0, conceptsAssessed: 0, conceptsTotal: 3 });
  });
});

describe("weakestConcepts", () => {
  it("returns lowest-mastery concepts first, gated by min evidence", () => {
    const byConcept = new Map<string, MasteryState>([
      ["strong", { mastery: 0.9, confidence: 0.5, attempts: 4, correct: 4 }],
      ["weak", { mastery: 0.2, confidence: 0.4, attempts: 3, correct: 1 }],
      ["unproven", { mastery: 0.1, confidence: 0.1, attempts: 1, correct: 0 }], // too little evidence
    ]);
    expect(weakestConcepts(byConcept, 5)).toEqual(["weak", "strong"]);
  });

  it("honours the limit", () => {
    const byConcept = new Map<string, MasteryState>([
      ["a", { mastery: 0.1, confidence: 0.4, attempts: 3, correct: 0 }],
      ["b", { mastery: 0.3, confidence: 0.4, attempts: 3, correct: 1 }],
    ]);
    expect(weakestConcepts(byConcept, 1)).toEqual(["a"]);
  });
});
