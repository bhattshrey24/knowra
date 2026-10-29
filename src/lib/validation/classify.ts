/**
 * Validation for an LLM-proposed classification (Phase 6.3). Like question
 * output, the model's JSON is untrusted and parsed through zod before use.
 */

import { z } from "zod";

export const classifiedConceptSchema = z.object({
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(100),
  concept: z.string().min(1).max(100),
});

export type ClassifiedConcept = z.infer<typeof classifiedConceptSchema>;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

export function parseClassified(raw: unknown): ParseResult<ClassifiedConcept> {
  const result = classifiedConceptSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    error: result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; "),
  };
}
