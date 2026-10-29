/**
 * Validation for LLM-generated questions. Model output is untrusted: it is
 * parsed through these zod schemas before it is ever stored or rendered, so a
 * malformed or hallucinated response is rejected rather than shown to a user.
 */

import { z } from "zod";
import type { Difficulty } from "@/types/learning";
import type { GeneratedQuestion } from "@/lib/llm/provider";

/** The raw shape a provider is asked to return for a multiple-choice question. */
export const llmMcqSchema = z
  .object({
    prompt: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(500)).min(2).max(6),
    correctIndex: z.number().int().nonnegative(),
    explanation: z.string().min(1).max(2000),
    /** Optional concept label the model assigns (Phase 6.1); app-validated. */
    concept: z.string().min(1).max(200).optional(),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "correctIndex is outside the options range",
    path: ["correctIndex"],
  });

export type LlmMcq = z.infer<typeof llmMcqSchema>;

export const llmMcqListSchema = z.array(llmMcqSchema).min(1).max(20);

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

/** Max questions kept from a single generation. */
const MAX_ITEMS = 20;

/**
 * Validate each item in an untrusted array, keeping the valid ones and dropping
 * the rest (small local models occasionally emit one malformed question — one
 * bad item shouldn't sink the whole quiz). Fails only when nothing is valid.
 */
function parseList<T>(raw: unknown, schema: z.ZodType<T>): ParseResult<T[]> {
  if (!Array.isArray(raw)) return { success: false, error: "expected a JSON array" };
  const data: T[] = [];
  for (const item of raw) {
    const result = schema.safeParse(item);
    if (result.success) data.push(result.data);
    if (data.length >= MAX_ITEMS) break;
  }
  if (data.length === 0) return { success: false, error: "no valid items in the array" };
  return { success: true, data };
}

/** Safe-parse an untrusted MCQ array from a provider. Never throws. */
export function parseLlmMcqs(raw: unknown): ParseResult<LlmMcq[]> {
  return parseList(raw, llmMcqSchema);
}

/** Attach the system-controlled difficulty/format to a validated MCQ. */
export function toGeneratedQuestion(mcq: LlmMcq, difficulty: Difficulty): GeneratedQuestion {
  return {
    difficulty,
    format: "mcq",
    prompt: mcq.prompt,
    options: mcq.options,
    correctIndices: [mcq.correctIndex],
    explanation: mcq.explanation,
    conceptLabel: mcq.concept,
  };
}

/** Multiple-select: one or more correct options, all in range and distinct. */
export const llmMultiSchema = z
  .object({
    prompt: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(500)).min(2).max(6),
    correctIndices: z.array(z.number().int().nonnegative()).min(1).max(6),
    explanation: z.string().min(1).max(2000),
    concept: z.string().min(1).max(200).optional(),
  })
  .refine((q) => q.correctIndices.every((i) => i < q.options.length), {
    message: "a correctIndex is outside the options range",
    path: ["correctIndices"],
  })
  .refine((q) => new Set(q.correctIndices).size === q.correctIndices.length, {
    message: "correctIndices must be distinct",
    path: ["correctIndices"],
  });

export type LlmMulti = z.infer<typeof llmMultiSchema>;

export const llmMultiListSchema = z.array(llmMultiSchema).min(1).max(20);

export function parseLlmMulti(raw: unknown): ParseResult<LlmMulti[]> {
  return parseList(raw, llmMultiSchema);
}

export function toGeneratedMultiQuestion(
  multi: LlmMulti,
  difficulty: Difficulty,
): GeneratedQuestion {
  return {
    difficulty,
    format: "multi",
    prompt: multi.prompt,
    options: multi.options,
    correctIndices: [...multi.correctIndices].sort((a, b) => a - b),
    explanation: multi.explanation,
    conceptLabel: multi.concept,
  };
}

/** Written: an open prompt with a reference answer used for grading. */
export const llmWrittenSchema = z.object({
  prompt: z.string().min(1).max(1000),
  referenceAnswer: z.string().min(1).max(2000),
  explanation: z.string().min(1).max(2000),
  concept: z.string().min(1).max(200).optional(),
});

export type LlmWritten = z.infer<typeof llmWrittenSchema>;

export const llmWrittenListSchema = z.array(llmWrittenSchema).min(1).max(20);

export function parseLlmWritten(raw: unknown): ParseResult<LlmWritten[]> {
  return parseList(raw, llmWrittenSchema);
}

export function toGeneratedWrittenQuestion(
  written: LlmWritten,
  difficulty: Difficulty,
): GeneratedQuestion {
  return {
    difficulty,
    format: "written",
    prompt: written.prompt,
    referenceAnswer: written.referenceAnswer,
    explanation: written.explanation,
    conceptLabel: written.concept,
  };
}
