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
  ClassifiedConcept,
  ClassifyInput,
  ExplainInput,
  GeneratedFlashcard,
  GeneratedQuestion,
  GenerateQuestionsInput,
  GenerateStudyPlanInput,
  GradeWrittenResult,
  LLMProvider,
} from "@/lib/llm/provider";
import type { StudyPlan } from "@/types/learning";
import { parseClassified } from "@/lib/validation/classify";
import { parseStudyPlan } from "@/lib/validation/study-plan";
import { buildStudyPlanPrompt } from "@/lib/llm/study-plan-prompt";
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

const MCQ_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      options: { type: "ARRAY", items: { type: "STRING" } },
      correctIndex: { type: "INTEGER" },
      explanation: { type: "STRING" },
      concept: { type: "STRING" },
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
      concept: { type: "STRING" },
    },
    required: ["prompt", "options", "correctIndices", "explanation"],
  },
} as const;

const WRITTEN_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      referenceAnswer: { type: "STRING" },
      explanation: { type: "STRING" },
      concept: { type: "STRING" },
    },
    required: ["prompt", "referenceAnswer", "explanation"],
  },
} as const;

const CLASSIFY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    subject: { type: "STRING" },
    topic: { type: "STRING" },
    concept: { type: "STRING" },
  },
  required: ["subject", "topic", "concept"],
} as const;

const STUDY_PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overview: { type: "STRING" },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          conceptId: { type: "STRING" },
          action: { type: "STRING" },
          reason: { type: "STRING" },
        },
        required: ["conceptId", "action", "reason"],
      },
    },
    encouragement: { type: "STRING" },
  },
  required: ["overview", "steps"],
} as const;

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-flash-lite-latest",
    private readonly fetchFn: FetchFn = fetch,
    private readonly timeoutMs = 30_000,
  ) {}

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const format = input.formats[0] ?? "mcq";
    const context = `"${input.conceptName}" (topic: ${input.topicName}, subject: ${input.domainName}) at difficulty ${input.difficulty}/5 (that level should ${difficultyGuideline(input.difficulty)})`;
    const avoid = input.avoidPrompts?.length
      ? ` Avoid repeating: ${input.avoidPrompts.join(" | ")}.`
      : "";

    if (format === "multi") {
      const prompt = `Generate ${input.count} multiple-select questions on ${context}. Each has 4 options and one OR MORE correct answers (correctIndices).${conceptClause(input)}${avoid}`;
      const raw = await this.generateJson(prompt, MULTI_RESPONSE_SCHEMA);
      const parsed = parseLlmMulti(raw);
      if (!parsed.success) throw new Error(`Gemini returned invalid multi output: ${parsed.error}`);
      return parsed.data.map((m) => toGeneratedMultiQuestion(m, input.difficulty));
    }

    if (format === "written") {
      const prompt = `Generate ${input.count} short open-ended questions on ${context}. For each, give a concise referenceAnswer (1-3 sentences) a grader can match against.${conceptClause(input)}${avoid}`;
      const raw = await this.generateJson(prompt, WRITTEN_RESPONSE_SCHEMA);
      const parsed = parseLlmWritten(raw);
      if (!parsed.success)
        throw new Error(`Gemini returned invalid written output: ${parsed.error}`);
      return parsed.data.map((w) => toGeneratedWrittenQuestion(w, input.difficulty));
    }

    const prompt = `Generate ${input.count} multiple-choice questions on ${context}. Each has exactly 4 options and one correct answer.${conceptClause(input)}${avoid}`;
    const raw = await this.generateJson(prompt, MCQ_RESPONSE_SCHEMA);
    const parsed = parseLlmMcqs(raw);
    if (!parsed.success) throw new Error(`Gemini returned invalid MCQ output: ${parsed.error}`);
    return parsed.data.map((mcq) => toGeneratedQuestion(mcq, input.difficulty));
  }

  async classify(input: ClassifyInput): Promise<ClassifiedConcept> {
    const existing = input.subjects.join(", ") || "(none yet)";
    const prompt =
      `Classify the learning request "${input.query}" into a Subject, Topic, and Concept for a ` +
      `study catalogue. Prefer an existing subject when it genuinely fits: ${existing}. Use ` +
      `concise, canonical names (e.g. Subject "Computer Science", Topic "Programming", Concept ` +
      `"Decorators").`;
    const raw = await this.generateJson(prompt, CLASSIFY_RESPONSE_SCHEMA);
    const parsed = parseClassified(raw);
    if (!parsed.success) throw new Error(`Gemini returned invalid classification: ${parsed.error}`);
    return parsed.data;
  }

  async explain(input: ExplainInput): Promise<string> {
    const prompt = [
      `A learner answered the question: "${input.question.prompt}".`,
      `Their answer was ${input.isCorrect ? "correct" : "incorrect"}.`,
      `In 2-3 sentences, explain the underlying concept clearly and encouragingly.`,
    ].join(" ");
    return this.generateText(prompt);
  }

  async generateStudyPlan(input: GenerateStudyPlanInput): Promise<StudyPlan> {
    const { prompt, allowedById } = buildStudyPlanPrompt(input);
    const raw = await this.generateJson(prompt, STUDY_PLAN_RESPONSE_SCHEMA);
    const parsed = parseStudyPlan(raw, allowedById);
    if (!parsed.success) throw new Error(`Gemini returned invalid study plan: ${parsed.error}`);
    return parsed.data;
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

  /** Quick, transient statuses worth a fast retry (overload / rate limit). */
  private static readonly RETRYABLE = new Set([429, 500, 503]);

  /**
   * POST with a per-attempt timeout. Fast transient *status* rejections (503/429)
   * are retried briefly; a *timeout/network* failure is NOT retried (a stalled
   * request tends to stall again) — it throws fast so the caller can fall back.
   */
  private async postWithRetry(body: string, attempts = 2): Promise<Response> {
    for (let i = 0; i < attempts; i += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(this.endpoint(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: controller.signal,
        });
        if (res.ok || !GeminiProvider.RETRYABLE.has(res.status) || i === attempts - 1) return res;
      } catch (err) {
        const aborted = (err as { name?: string })?.name === "AbortError";
        throw new Error(
          aborted
            ? `Gemini request timed out after ${this.timeoutMs / 1000}s`
            : `Gemini request failed: ${(err as Error)?.message ?? "network error"}`,
        );
      } finally {
        clearTimeout(timer);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    // Unreachable: the loop returns or throws.
    throw new Error("Gemini request failed");
  }

  private async generateText(prompt: string): Promise<string> {
    const res = await this.postWithRetry(
      JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    );
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    return this.extractText(await res.json());
  }

  private async generateJson(prompt: string, responseSchema: unknown): Promise<unknown> {
    const res = await this.postWithRetry(
      JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema },
      }),
    );
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    const text = this.extractText(await res.json());
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini returned non-JSON content");
    }
  }
}
