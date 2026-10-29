import { describe, expect, it } from "vitest";
import {
  allocateFormatCounts,
  interleaveByFormat,
  planFormatSequence,
} from "@/lib/learning/quiz-composition";
import type { QuestionFormat } from "@/types/learning";

describe("planFormatSequence", () => {
  it("round-robins the selected formats across the total", () => {
    expect(planFormatSequence(5, ["mcq", "written"])).toEqual([
      "mcq",
      "written",
      "mcq",
      "written",
      "mcq",
    ]);
  });

  it("returns a single format repeated when only one is selected", () => {
    expect(planFormatSequence(3, ["multi"])).toEqual(["multi", "multi", "multi"]);
  });

  it("de-duplicates repeated formats", () => {
    expect(planFormatSequence(4, ["mcq", "mcq", "written"])).toEqual([
      "mcq",
      "written",
      "mcq",
      "written",
    ]);
  });

  it("is empty for a non-positive total or no formats", () => {
    expect(planFormatSequence(0, ["mcq"])).toEqual([]);
    expect(planFormatSequence(5, [])).toEqual([]);
  });
});

describe("allocateFormatCounts", () => {
  it("splits as evenly as possible, extra going to earlier formats", () => {
    expect(allocateFormatCounts(5, ["mcq", "written"])).toEqual({ mcq: 3, written: 2 });
  });

  it("gives each selected format at least one when the total allows", () => {
    expect(allocateFormatCounts(3, ["mcq", "multi", "written"])).toEqual({
      mcq: 1,
      multi: 1,
      written: 1,
    });
  });

  it("totals the requested count", () => {
    const counts = allocateFormatCounts(30, ["mcq", "multi", "written"]);
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(30);
  });
});

describe("interleaveByFormat", () => {
  const q = (format: QuestionFormat, n: number) => ({ format, prompt: `${format}-${n}` });

  it("orders questions to follow the planned round-robin sequence", () => {
    const generated = [q("mcq", 1), q("mcq", 2), q("mcq", 3), q("written", 1), q("written", 2)];
    const ordered = interleaveByFormat(generated, 5, ["mcq", "written"]);
    expect(ordered.map((x) => x.prompt)).toEqual([
      "mcq-1",
      "written-1",
      "mcq-2",
      "written-2",
      "mcq-3",
    ]);
  });

  it("appends any leftover questions the provider returned beyond the plan", () => {
    const generated = [q("mcq", 1), q("written", 1), q("written", 2)];
    const ordered = interleaveByFormat(generated, 2, ["mcq", "written"]);
    expect(ordered).toHaveLength(3);
    expect(ordered.slice(0, 2).map((x) => x.prompt)).toEqual(["mcq-1", "written-1"]);
    expect(ordered[2].prompt).toBe("written-2");
  });
});
