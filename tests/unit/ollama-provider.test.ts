import { describe, expect, it } from "vitest";
import { OllamaProvider } from "@/lib/llm/ollama";

/** Fake fetch returning Ollama's { message: { content } } chat shape. */
function fakeFetch(content: string, ok = true, status = 200) {
  return (async () =>
    ({
      ok,
      status,
      json: async () => ({ message: { content } }),
    }) as unknown as Response) as typeof fetch;
}

const input = {
  conceptName: "Fractions",
  topicName: "Arithmetic",
  domainName: "Mathematics",
  difficulty: 2 as const,
  formats: ["mcq" as const],
  count: 1,
};

const validMcq = [
  {
    prompt: "1/2 + 1/2 = ?",
    options: ["1", "1/4", "2", "0"],
    correctIndex: 0,
    explanation: "They sum to a whole.",
  },
];

describe("OllamaProvider.generateQuestions", () => {
  it("parses a well-formed chat response into GeneratedQuestions", async () => {
    const provider = new OllamaProvider(
      "http://x",
      "llama3.2",
      fakeFetch(JSON.stringify(validMcq)),
    );
    const questions = await provider.generateQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ format: "mcq", difficulty: 2, correctIndices: [0] });
  });

  it("rejects invalid model output (out-of-range correctIndex)", async () => {
    const bad = [{ ...validMcq[0], correctIndex: 9 }];
    const provider = new OllamaProvider("http://x", "llama3.2", fakeFetch(JSON.stringify(bad)));
    await expect(provider.generateQuestions(input)).rejects.toThrow(/invalid MCQ/i);
  });

  it("throws on non-JSON content", async () => {
    const provider = new OllamaProvider("http://x", "llama3.2", fakeFetch("not json"));
    await expect(provider.generateQuestions(input)).rejects.toThrow(/non-JSON/i);
  });

  it("throws on a failed HTTP response", async () => {
    const provider = new OllamaProvider("http://x", "llama3.2", fakeFetch("", false, 500));
    await expect(provider.generateQuestions(input)).rejects.toThrow(/500/);
  });
});
