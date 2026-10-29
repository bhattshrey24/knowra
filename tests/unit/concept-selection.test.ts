import { describe, expect, it } from "vitest";
import { selectConceptsForQuiz, type ConceptCandidate } from "@/lib/learning/concept-selection";
import type { MasteryState } from "@/lib/learning/mastery";

const state = (mastery: number, attempts: number): MasteryState => ({
  mastery,
  confidence: Math.min(1, attempts / 20),
  attempts,
  correct: Math.round(mastery * attempts),
});

describe("selectConceptsForQuiz", () => {
  it("balances weak, unassessed, and retention-due concepts", () => {
    const candidates: ConceptCandidate[] = [
      { id: "weak1", state: state(0.2, 4) },
      { id: "fresh-unseen" }, // unassessed
      { id: "mastered-stale", state: state(0.9, 5), lastSeenDaysAgo: 30 }, // retention
    ];
    const picked = selectConceptsForQuiz(candidates, 3);
    const byId = new Map(picked.map((p) => [p.id, p.reason]));
    expect(byId.get("weak1")).toBe("weak");
    expect(byId.get("fresh-unseen")).toBe("unassessed");
    expect(byId.get("mastered-stale")).toBe("retention");
  });

  it("does not classify a concept weak from a single response (min evidence)", () => {
    const picked = selectConceptsForQuiz([{ id: "c1", state: state(0.1, 1) }], 1);
    expect(picked[0]).toEqual({ id: "c1", reason: "unassessed" });
  });

  it("treats a freshly mastered concept as practice, not retention", () => {
    const picked = selectConceptsForQuiz(
      [{ id: "m", state: state(0.9, 5), lastSeenDaysAgo: 1 }],
      1,
    );
    expect(picked[0].reason).not.toBe("retention");
  });

  it("returns distinct concepts, never more than requested", () => {
    const candidates: ConceptCandidate[] = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}` }));
    const picked = selectConceptsForQuiz(candidates, 4);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((p) => p.id)).size).toBe(4);
  });

  it("returns all candidates when fewer exist than requested", () => {
    const picked = selectConceptsForQuiz([{ id: "a" }, { id: "b" }], 5);
    expect(picked.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("prioritises the weakest concept first within the weak bucket", () => {
    const candidates: ConceptCandidate[] = [
      { id: "less-weak", state: state(0.45, 4) },
      { id: "very-weak", state: state(0.1, 4) },
    ];
    const picked = selectConceptsForQuiz(candidates, 1);
    expect(picked[0].id).toBe("very-weak");
  });

  it("is empty when there are no candidates", () => {
    expect(selectConceptsForQuiz([], 5)).toEqual([]);
  });
});
