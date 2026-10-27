import { describe, expect, it } from "vitest";
import { parseLlmMcqs, toGeneratedQuestion } from "@/lib/validation/question";

const validRaw = [
  {
    prompt: "What is 2 + 2?",
    options: ["3", "4", "5", "22"],
    correctIndex: 1,
    explanation: "2 + 2 = 4.",
  },
];

describe("parseLlmMcqs (untrusted LLM output)", () => {
  it("accepts a well-formed MCQ array", () => {
    const result = parseLlmMcqs(validRaw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
  });

  it("rejects a correctIndex outside the options range", () => {
    const result = parseLlmMcqs([{ ...validRaw[0], correctIndex: 9 }]);
    expect(result.success).toBe(false);
  });

  it("rejects missing or empty fields", () => {
    expect(parseLlmMcqs([{ ...validRaw[0], prompt: "" }]).success).toBe(false);
    expect(parseLlmMcqs([{ ...validRaw[0], options: ["only one"] }]).success).toBe(false);
    expect(parseLlmMcqs([{ options: ["a", "b"], correctIndex: 0 }]).success).toBe(false);
  });

  it("rejects non-array and junk input (model hallucinations)", () => {
    expect(parseLlmMcqs("not json").success).toBe(false);
    expect(parseLlmMcqs({ prompt: "x" }).success).toBe(false);
    expect(parseLlmMcqs(null).success).toBe(false);
  });
});

describe("toGeneratedQuestion", () => {
  it("maps a validated MCQ to a GeneratedQuestion at the given difficulty", () => {
    const parsed = parseLlmMcqs(validRaw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const q = toGeneratedQuestion(parsed.data[0], 3);
    expect(q).toMatchObject({
      format: "mcq",
      difficulty: 3,
      prompt: "What is 2 + 2?",
      correctIndices: [1],
    });
    expect(q.options).toHaveLength(4);
  });
});
