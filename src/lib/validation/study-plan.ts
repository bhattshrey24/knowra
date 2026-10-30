/**
 * Validation + guardrail for an LLM-proposed study plan. The model's JSON is
 * untrusted: we validate its shape with zod AND enforce that every step refers
 * to a concept the engine actually selected — the LLM can describe and
 * prioritize, but it can never invent a concept or claim a weakness outside the
 * facts it was given. The displayed concept name comes from our data, not the
 * model.
 */

import { z } from "zod";
import type { StudyPlan, StudyStep } from "@/types/learning";

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

const rawStudyPlanSchema = z.object({
  overview: z.string().min(1).max(600),
  steps: z
    .array(
      z.object({
        conceptId: z.string().min(1).max(100),
        action: z.enum(["learn", "review", "strengthen"]),
        reason: z.string().min(1).max(400),
      }),
    )
    .max(20),
  encouragement: z.string().max(400).optional(),
});

/**
 * Parse and guardrail an LLM study plan against the allowed concepts
 * (`id → authoritative name`). Steps referencing unknown concepts are dropped;
 * each surviving step's `conceptName` is taken from our map, never the model.
 * Fails (so the caller falls back deterministically) if the shape is invalid or
 * nothing survives filtering.
 */
export function parseStudyPlan(
  raw: unknown,
  allowedById: Map<string, string>,
): ParseResult<StudyPlan> {
  const result = rawStudyPlanSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    };
  }

  const seen = new Set<string>();
  const steps: StudyStep[] = [];
  for (const s of result.data.steps) {
    const conceptName = allowedById.get(s.conceptId);
    if (!conceptName || seen.has(s.conceptId)) continue; // drop invented/duplicate concepts
    seen.add(s.conceptId);
    steps.push({ conceptId: s.conceptId, conceptName, action: s.action, reason: s.reason.trim() });
  }

  if (steps.length === 0) {
    return { success: false, error: "no steps referenced an allowed concept" };
  }

  return {
    success: true,
    data: {
      overview: result.data.overview.trim(),
      steps,
      encouragement: result.data.encouragement?.trim() || undefined,
    },
  };
}
