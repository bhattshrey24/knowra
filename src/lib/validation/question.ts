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
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "correctIndex is outside the options range",
    path: ["correctIndex"],
  });

export type LlmMcq = z.infer<typeof llmMcqSchema>;

export const llmMcqListSchema = z.array(llmMcqSchema).min(1).max(20);

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

/** Safe-parse an untrusted MCQ array from a provider. Never throws. */
export function parseLlmMcqs(raw: unknown): ParseResult<LlmMcq[]> {
  const result = llmMcqListSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
  };
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
  };
}

/** Multiple-select: one or more correct options, all in range and distinct. */
export const llmMultiSchema = z
  .object({
    prompt: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(500)).min(2).max(6),
    correctIndices: z.array(z.number().int().nonnegative()).min(1).max(6),
    explanation: z.string().min(1).max(2000),
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
  const result = llmMultiListSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
  };
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
  };
}

/** Written: an open prompt with a reference answer used for grading. */
export const llmWrittenSchema = z.object({
  prompt: z.string().min(1).max(1000),
  referenceAnswer: z.string().min(1).max(2000),
  explanation: z.string().min(1).max(2000),
});

export type LlmWritten = z.infer<typeof llmWrittenSchema>;

export const llmWrittenListSchema = z.array(llmWrittenSchema).min(1).max(20);

export function parseLlmWritten(raw: unknown): ParseResult<LlmWritten[]> {
  const result = llmWrittenListSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
  };
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
  };
}
