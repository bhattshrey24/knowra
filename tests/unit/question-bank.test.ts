import { describe, expect, it } from "vitest";
import { curatedQuiz, hasCurated } from "@/lib/learning/question-bank";
import { CURATED_QUESTIONS } from "@/lib/learning/question-bank-data";
import { buildTaxonomy } from "@/lib/learning/taxonomy";
import { SEED_TAXONOMY } from "@/lib/taxonomy/seed";

const tax = buildTaxonomy(SEED_TAXONOMY);

describe("curated question bank data integrity", () => {
  it("has at least one curated question", () => {
    expect(CURATED_QUESTIONS.length).toBeGreaterThan(0);
  });

  it("every question is keyed to a real taxonomy concept", () => {
    for (const q of CURATED_QUESTIONS) {
      expect(tax.conceptById.has(q.conceptId), `unknown concept: ${q.conceptId}`).toBe(true);
    }
  });

  it("every mcq has exactly 4 options and one in-range correct index", () => {
    for (const q of CURATED_QUESTIONS.filter((c) => c.format === "mcq")) {
      expect(q.options, q.prompt).toHaveLength(4);
      expect(q.correctIndices, q.prompt).toHaveLength(1);
      const idx = q.correctIndices![0];
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    }
  });

  it("every question has a non-empty prompt and explanation", () => {
    for (const q of CURATED_QUESTIONS) {
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect((q.explanation ?? "").trim().length).toBeGreaterThan(0);
    }
  });
});

describe("curatedQuiz selection", () => {
  it("returns only questions for the requested concepts (never unrelated)", () => {
    const res = curatedQuiz(["fractions"], 2, ["mcq"], 10);
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((q) => q.conceptId === "fractions")).toBe(true);
  });

  it("caps results at the requested count", () => {
    const res = curatedQuiz(["fractions", "percentages"], 2, ["mcq"], 2);
    expect(res).toHaveLength(2);
  });

  it("round-robins across concepts for variety", () => {
    const res = curatedQuiz(["fractions", "percentages"], 2, ["mcq"], 2);
    expect(new Set(res.map((q) => q.conceptId)).size).toBe(2);
  });

  it("prefers the requested difficulty, widening only when needed", () => {
    // quadratic-equations has a difficulty-3 and a difficulty-4 curated question.
    expect(curatedQuiz(["quadratic-equations"], 3, ["mcq"], 1)[0].difficulty).toBe(3);
    expect(curatedQuiz(["quadratic-equations"], 4, ["mcq"], 1)[0].difficulty).toBe(4);
  });

  it("filters by format", () => {
    expect(curatedQuiz(["fractions"], 2, ["written"], 5)).toHaveLength(0);
  });

  it("returns empty for concepts with no curated coverage", () => {
    expect(curatedQuiz(["integrals"], 3, ["mcq"], 5)).toHaveLength(0);
    expect(curatedQuiz([], 3, ["mcq"], 5)).toHaveLength(0);
  });

  it("is deterministic: same inputs produce the same output", () => {
    const a = curatedQuiz(["fractions", "percentages"], 2, ["mcq"], 3);
    const b = curatedQuiz(["fractions", "percentages"], 2, ["mcq"], 3);
    expect(a).toEqual(b);
  });
});

describe("hasCurated", () => {
  it("reports coverage per concept", () => {
    expect(hasCurated(["fractions"])).toBe(true);
    expect(hasCurated(["integrals"])).toBe(false);
    expect(hasCurated(["integrals", "fractions"])).toBe(true);
    expect(hasCurated([])).toBe(false);
  });
});
