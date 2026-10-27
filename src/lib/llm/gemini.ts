/**
 * Google Gemini provider (default free backend). Uses the Generative Language
 * REST API with structured JSON output, then validates the response with the
 * same `parseLlmMcqs` used everywhere — the model's output is untrusted.
 *
 * `fetchFn` is injectable so the parse/validate path can be unit-tested without
 * a real API key. Only `generateQuestions` and `explain` are needed in Phase 1;
 * flashcards and written grading are implemented in Phase 2.
 */

import type {
  ExplainInput,
  GeneratedFlashcard,
  GeneratedQuestion,
  GenerateQuestionsInput,
  GradeWrittenResult,
  LLMProvider,
} from "@/lib/llm/provider";
import {
  parseLlmMcqs,
  parseLlmMulti,
  toGeneratedMultiQuestion,
  toGeneratedQuestion,
} from "@/lib/validation/question";

type FetchFn = typeof fetch;

const MCQ_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      options: { type: "ARRAY", items: { type: "STRING" } },
      correctIndex: { type: "INTEGER" },
      explanation: { type: "STRING" },
    },
    required: ["prompt", "options", "correctIndex", "explanation"],
  },
} as const;

const MULTI_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      options: { type: "ARRAY", items: { type: "STRING" } },
      correctIndices: { type: "ARRAY", items: { type: "INTEGER" } },
      explanation: { type: "STRING" },
    },
    required: ["prompt", "options", "correctIndices", "explanation"],
  },
} as const;

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-2.0-flash",
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const format = input.formats[0] ?? "mcq";
    const context = `"${input.conceptName}" (topic: ${input.topicName}, subject: ${input.domainName}) at difficulty ${input.difficulty}/5`;
    const avoid = input.avoidPrompts?.length
      ? ` Avoid repeating: ${input.avoidPrompts.join(" | ")}.`
      : "";

    if (format === "multi") {
      const prompt = `Generate ${input.count} multiple-select questions on ${context}. Each has 4 options and one OR MORE correct answers (correctIndices).${avoid}`;
      const raw = await this.generateJson(prompt, MULTI_RESPONSE_SCHEMA);
      const parsed = parseLlmMulti(raw);
      if (!parsed.success) throw new Error(`Gemini returned invalid multi output: ${parsed.error}`);
      return parsed.data.map((m) => toGeneratedMultiQuestion(m, input.difficulty));
    }

    const prompt = `Generate ${input.count} multiple-choice questions on ${context}. Each has exactly 4 options and one correct answer.${avoid}`;
    const raw = await this.generateJson(prompt, MCQ_RESPONSE_SCHEMA);
    const parsed = parseLlmMcqs(raw);
    if (!parsed.success) throw new Error(`Gemini returned invalid MCQ output: ${parsed.error}`);
    return parsed.data.map((mcq) => toGeneratedQuestion(mcq, input.difficulty));
  }

  async explain(input: ExplainInput): Promise<string> {
    const prompt = [
      `A learner answered the question: "${input.question.prompt}".`,
      `Their answer was ${input.isCorrect ? "correct" : "incorrect"}.`,
      `In 2-3 sentences, explain the underlying concept clearly and encouragingly.`,
    ].join(" ");
    return this.generateText(prompt);
  }

  async generateFlashcards(): Promise<GeneratedFlashcard[]> {
    throw new Error("GeminiProvider.generateFlashcards is implemented in Phase 2");
  }

  async gradeWritten(): Promise<GradeWrittenResult> {
    throw new Error("GeminiProvider.gradeWritten is implemented in Phase 2");
  }

  private endpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  private extractText(json: unknown): string {
    const parts = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      ?.candidates?.[0]?.content?.parts;
    const text = parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("Gemini response contained no text");
    return text;
  }

  private async generateText(prompt: string): Promise<string> {
    const res = await this.fetchFn(this.endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    return this.extractText(await res.json());
  }

  private async generateJson(prompt: string, responseSchema: unknown): Promise<unknown> {
    const res = await this.fetchFn(this.endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema },
      }),
    });
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    const text = this.extractText(await res.json());
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini returned non-JSON content");
    }
  }
}
