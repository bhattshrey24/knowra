import { describe, expect, it } from "vitest";
import { GeminiProvider } from "@/lib/llm/gemini";

/** Builds a fake fetch whose Gemini response carries `text` as the model output. */
function fakeFetch(text: string, ok = true, status = 200) {
  return (async () =>
    ({
      ok,
      status,
      json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    }) as unknown as Response) as typeof fetch;
}

const input = {
  conceptName: "Photosynthesis",
  topicName: "Biology",
  domainName: "Science",
  difficulty: 3 as const,
  formats: ["mcq" as const],
  count: 1,
};

const validMcq = [
  {
    prompt: "Where does photosynthesis mainly occur?",
    options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"],
    correctIndex: 1,
    explanation: "Chloroplasts contain chlorophyll.",
  },
];

describe("GeminiProvider.generateQuestions", () => {
  it("parses and validates a well-formed response", async () => {
    const provider = new GeminiProvider(
      "test-key",
      "gemini-2.0-flash",
      fakeFetch(JSON.stringify(validMcq)),
    );
    const questions = await provider.generateQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ format: "mcq", difficulty: 3, correctIndices: [1] });
  });

  it("rejects an out-of-range correctIndex from the model", async () => {
    const bad = [{ ...validMcq[0], correctIndex: 7 }];
    const provider = new GeminiProvider(
      "test-key",
      "gemini-2.0-flash",
      fakeFetch(JSON.stringify(bad)),
    );
    await expect(provider.generateQuestions(input)).rejects.toThrow(/invalid MCQ/i);
  });

  it("throws on non-JSON model content", async () => {
    const provider = new GeminiProvider(
      "test-key",
      "gemini-2.0-flash",
      fakeFetch("sorry, I can't do that"),
    );
    await expect(provider.generateQuestions(input)).rejects.toThrow(/non-JSON/i);
  });

  it("throws on a failed HTTP response", async () => {
    const provider = new GeminiProvider("test-key", "gemini-2.0-flash", fakeFetch("", false, 429));
    await expect(provider.generateQuestions(input)).rejects.toThrow(/429/);
  });
});
