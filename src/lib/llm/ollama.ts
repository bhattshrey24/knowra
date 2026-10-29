/**
 * Ollama provider (local, offline, free). Implements the same `LLMProvider`
 * interface as Gemini/Mock, so the app's core logic is unchanged — only the
 * factory decides which backend to use. Talks to a local Ollama daemon's
 * /api/chat with JSON-schema structured output, then validates the result with
 * the same `parseLlm*` helpers used for every provider (model output is
 * untrusted regardless of source).
 *
 * Config: OLLAMA_BASE_URL (default http://localhost:11434), OLLAMA_MODEL.
 */

import type {
  ClassifiedConcept,
  ClassifyInput,
  ExplainInput,
  GeneratedFlashcard,
  GeneratedQuestion,
  GenerateFlashcardsInput,
  GenerateQuestionsInput,
  GradeWrittenResult,
  LLMProvider,
} from "@/lib/llm/provider";
import { parseClassified } from "@/lib/validation/classify";
import {
  parseLlmMcqs,
  parseLlmMulti,
  parseLlmWritten,
  toGeneratedMultiQuestion,
  toGeneratedQuestion,
  toGeneratedWrittenQuestion,
} from "@/lib/validation/question";
import { difficultyGuideline } from "@/lib/learning/difficulty";
import { conceptClause } from "@/lib/llm/concept-prompt";

type FetchFn = typeof fetch;

// JSON Schema (lowercase types) — Ollama's structured-output `format` field.
const STRING = { type: "string" } as const;
const MCQ_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      prompt: STRING,
      options: { type: "array", items: STRING, minItems: 4, maxItems: 4 },
      correctIndex: { type: "integer" },
      explanation: STRING,
      concept: STRING,
    },
    required: ["prompt", "options", "correctIndex", "explanation"],
  },
} as const;
const MULTI_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      prompt: STRING,
      options: { type: "array", items: STRING, minItems: 4, maxItems: 4 },
      correctIndices: { type: "array", items: { type: "integer" } },
      explanation: STRING,
      concept: STRING,
    },
    required: ["prompt", "options", "correctIndices", "explanation"],
  },
} as const;
const WRITTEN_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: { prompt: STRING, referenceAnswer: STRING, explanation: STRING, concept: STRING },
    required: ["prompt", "referenceAnswer", "explanation"],
  },
} as const;
const FLASHCARD_SCHEMA = {
  type: "object",
  properties: { front: STRING, back: STRING },
  required: ["front", "back"],
} as const;
const CLASSIFY_SCHEMA = {
  type: "object",
  properties: { subject: STRING, topic: STRING, concept: STRING },
  required: ["subject", "topic", "concept"],
} as const;

export class OllamaProvider implements LLMProvider {
  readonly id = "ollama";

  constructor(
    private readonly baseUrl = "http://localhost:11434",
    private readonly model = "llama3.2",
    private readonly fetchFn: FetchFn = fetch,
    // Generous for slow local CPU inference, especially a cold first request.
    // Override with OLLAMA_TIMEOUT_MS.
    private readonly timeoutMs = 90_000,
  ) {}

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const format = input.formats[0] ?? "mcq";
    const context = `"${input.conceptName}" (topic: ${input.topicName}, subject: ${input.domainName}) at difficulty ${input.difficulty}/5 (that level should ${difficultyGuideline(input.difficulty)})`;

    if (format === "written") {
      const raw = await this.chatJson(
        `Generate ${input.count} short open-ended questions on ${context}. Give each a concise referenceAnswer (1-3 sentences).${conceptClause(input)} Respond as a JSON array.`,
        WRITTEN_SCHEMA,
      );
      const parsed = parseLlmWritten(raw);
      if (!parsed.success) throw new Error(`Ollama invalid written output: ${parsed.error}`);
      return parsed.data.map((w) => toGeneratedWrittenQuestion(w, input.difficulty));
    }

    if (format === "multi") {
      const raw = await this.chatJson(
        `Generate ${input.count} multiple-select questions on ${context}.${conceptClause(input)} Each question must have exactly 4 options and one or more correct answers (correctIndices). "prompt" must be the question itself. Respond as a JSON array.`,
        MULTI_SCHEMA,
      );
      const parsed = parseLlmMulti(raw);
      if (!parsed.success) throw new Error(`Ollama invalid multi output: ${parsed.error}`);
      return parsed.data.map((m) => toGeneratedMultiQuestion(m, input.difficulty));
    }

    const raw = await this.chatJson(
      `Generate ${input.count} multiple-choice questions on ${context}.${conceptClause(input)} Each question must have exactly 4 options and one correct answer (correctIndex). "prompt" must be the actual question itself (never a title like "Multiple Choice Questions"). Respond as a JSON array.`,
      MCQ_SCHEMA,
    );
    const parsed = parseLlmMcqs(raw);
    if (!parsed.success) throw new Error(`Ollama invalid MCQ output: ${parsed.error}`);
    return parsed.data.map((mcq) => toGeneratedQuestion(mcq, input.difficulty));
  }

  async generateFlashcards(input: GenerateFlashcardsInput): Promise<GeneratedFlashcard[]> {
    const prompt =
      input.type === "connection" && input.analogyAnchor
        ? `Write one short flashcard explaining "${input.concept.name}" by analogy to ${input.analogyAnchor} (a subject the learner knows). front = a question, back = the analogy. Respond as JSON.`
        : `Write one short flashcard for the concept "${input.concept.name}". front = a question, back = the answer. Respond as JSON.`;
    const raw = (await this.chatJson(prompt, FLASHCARD_SCHEMA)) as {
      front?: string;
      back?: string;
    };
    if (!raw?.front || !raw?.back) throw new Error("Ollama returned an invalid flashcard");
    return [{ type: input.type, front: raw.front, back: raw.back }];
  }

  async classify(input: ClassifyInput): Promise<ClassifiedConcept> {
    const existing = input.subjects.join(", ") || "(none yet)";
    const raw = await this.chatJson(
      `Classify the learning request "${input.query}" into a Subject, Topic, and Concept for a study catalogue. Prefer an existing subject if it fits: ${existing}. Respond as JSON {subject, topic, concept} with short canonical names.`,
      CLASSIFY_SCHEMA,
    );
    const parsed = parseClassified(raw);
    if (!parsed.success) throw new Error(`Ollama invalid classification: ${parsed.error}`);
    return parsed.data;
  }

  async explain(input: ExplainInput): Promise<string> {
    return this.chatText(
      `A learner answered "${input.question.prompt}" ${input.isCorrect ? "correctly" : "incorrectly"}. In 2-3 sentences, explain the concept clearly and encouragingly.`,
    );
  }

  async gradeWritten(): Promise<GradeWrittenResult> {
    // The deterministic engine (grade-written.ts) grades written answers today.
    throw new Error("OllamaProvider.gradeWritten is not used; deterministic grader handles it");
  }

  private async post(body: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      throw new Error(
        aborted
          ? `Ollama timed out after ${this.timeoutMs / 1000}s (is the model loaded? try a smaller OLLAMA_MODEL)`
          : `Ollama request failed: ${(err as Error)?.message ?? "is the daemon running?"}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractContent(json: unknown): string {
    const content = (json as { message?: { content?: string } })?.message?.content ?? "";
    if (!content) throw new Error("Ollama response had no content");
    return content;
  }

  private async chatText(prompt: string): Promise<string> {
    const res = await this.post(
      JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        // Keep the model resident so the next request isn't a cold start.
        keep_alive: "10m",
      }),
    );
    if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`);
    return this.extractContent(await res.json());
  }

  private readonly systemPrompt =
    "You are an educational quiz generator. Always produce valid JSON matching the schema. The 'prompt' field must be the actual question text itself. 'options' must contain exactly 4 plausible choices. Never include titles, concept tags, or JSON syntax inside options.";

  private async chatJson(
    prompt: string,
    format: unknown,
    systemPrompt = this.systemPrompt,
  ): Promise<unknown> {
    const res = await this.post(
      JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
        format,
        options: { temperature: 0.6 },
        // Keep the model resident so the next request isn't a cold start.
        keep_alive: "10m",
      }),
    );
    if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`);
    const content = this.extractContent(await res.json());
    try {
      return JSON.parse(content);
    } catch {
      throw new Error("Ollama returned non-JSON content");
    }
  }
}
