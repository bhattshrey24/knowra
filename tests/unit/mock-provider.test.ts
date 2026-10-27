import { describe, expect, it } from "vitest";
import { MockLLMProvider } from "@/lib/llm/mock";
import { parseLlmMcqs } from "@/lib/validation/question";

const input = {
  conceptName: "Addition",
  topicName: "Arithmetic",
  domainName: "Mathematics",
  difficulty: 2 as const,
  formats: ["mcq" as const],
  count: 5,
};

describe("MockLLMProvider", () => {
  it("generates the requested number of MCQ questions", async () => {
    const provider = new MockLLMProvider();
    const questions = await provider.generateQuestions(input);
    expect(questions).toHaveLength(5);
    for (const q of questions) {
      expect(q.format).toBe("mcq");
      expect(q.difficulty).toBe(2);
      expect(q.options!.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndices).toHaveLength(1);
      expect(q.correctIndices![0]).toBeLessThan(q.options!.length);
    }
  });

  it("produces output that passes the same validation as real providers", async () => {
    const provider = new MockLLMProvider();
    const questions = await provider.generateQuestions(input);
    const raw = questions.map((q) => ({
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndices![0],
      explanation: q.explanation,
    }));
    expect(parseLlmMcqs(raw).success).toBe(true);
  });

  it("is deterministic for a given input", async () => {
    const provider = new MockLLMProvider();
    const a = await provider.generateQuestions(input);
    const b = await provider.generateQuestions(input);
    expect(a).toEqual(b);
  });
});
