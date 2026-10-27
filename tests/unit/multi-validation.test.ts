import { describe, expect, it } from "vitest";
import { parseLlmMulti, toGeneratedMultiQuestion } from "@/lib/validation/question";

const validRaw = [
  {
    prompt: "Which of these are prime numbers?",
    options: ["2", "4", "7", "9"],
    correctIndices: [0, 2],
    explanation: "2 and 7 are prime.",
  },
];

describe("parseLlmMulti", () => {
  it("accepts a well-formed multi-select question", () => {
    const result = parseLlmMulti(validRaw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].correctIndices).toEqual([0, 2]);
  });

  it("requires at least one correct index", () => {
    expect(parseLlmMulti([{ ...validRaw[0], correctIndices: [] }]).success).toBe(false);
  });

  it("rejects an out-of-range or duplicate index", () => {
    expect(parseLlmMulti([{ ...validRaw[0], correctIndices: [0, 9] }]).success).toBe(false);
    expect(parseLlmMulti([{ ...validRaw[0], correctIndices: [1, 1] }]).success).toBe(false);
  });

  it("rejects junk input", () => {
    expect(parseLlmMulti("nope").success).toBe(false);
  });
});

describe("toGeneratedMultiQuestion", () => {
  it("maps a validated multi to a GeneratedQuestion with format 'multi'", () => {
    const parsed = parseLlmMulti(validRaw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const q = toGeneratedMultiQuestion(parsed.data[0], 4);
    expect(q).toMatchObject({ format: "multi", difficulty: 4, correctIndices: [0, 2] });
    expect(q.options).toHaveLength(4);
  });
});
