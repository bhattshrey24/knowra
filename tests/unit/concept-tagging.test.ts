import { describe, expect, it } from "vitest";
import { assignConceptIds } from "@/lib/learning/concept-tagging";

const allowed = [
  { id: "fractions", name: "Fractions" },
  { id: "percentages", name: "Percentages" },
  { id: "ratios-proportions", name: "Ratios & proportions" },
];

describe("assignConceptIds", () => {
  it("maps a valid LLM label to its concept id (case/space-insensitive)", () => {
    expect(assignConceptIds(["  fractions ", "PERCENTAGES"], allowed)).toEqual([
      "fractions",
      "percentages",
    ]);
  });

  it("falls back to round-robin for a missing or unknown label", () => {
    // index 0 → fractions, index 1 → percentages, index 2 → ratios (round-robin)
    expect(assignConceptIds([undefined, "not a concept", ""], allowed)).toEqual([
      "fractions",
      "percentages",
      "ratios-proportions",
    ]);
  });

  it("mixes validated labels and fallbacks, preserving order", () => {
    expect(assignConceptIds(["Ratios & proportions", "???"], allowed)).toEqual([
      "ratios-proportions",
      "percentages", // fallback for index 1
    ]);
  });

  it("returns null when there are no allowed concepts (caller keeps its default)", () => {
    expect(assignConceptIds(["anything"], [])).toBeNull();
  });
});
