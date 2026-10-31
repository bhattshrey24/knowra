/**
 * Validation + bounding for the AI tutor. The request body (a chat message and
 * short history) is untrusted user input; the model's reply is untrusted output.
 * Neither can change the rules — the engine owns all learner facts, and the
 * reply is rendered as plain text, never HTML.
 */

import { z } from "zod";

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

export const MAX_MESSAGE = 2000;
export const MAX_HISTORY = 10;
export const MAX_REPLY = 4000;

export const tutorRequestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE),
      }),
    )
    .max(MAX_HISTORY)
    .optional()
    .default([]),
});

export type TutorRequest = z.infer<typeof tutorRequestSchema>;

/** Bound and sanitise a model reply to a safe, non-empty plain-text string. */
export function parseTutorReply(raw: unknown): ParseResult<string> {
  if (typeof raw !== "string") return { success: false, error: "reply was not text" };
  const trimmed = raw.trim();
  if (!trimmed) return { success: false, error: "empty reply" };
  return { success: true, data: trimmed.slice(0, MAX_REPLY) };
}
