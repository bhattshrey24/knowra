import type { GenerateQuestionsInput } from "@/lib/llm/provider";

/**
 * The instruction appended to a generation prompt when a quiz is scoped to
 * specific taxonomy concepts (Phase 6.1). Asks the model to spread questions
 * across them and tag each with the concept it tests; the app validates the
 * label. Empty when no concepts are supplied, so single-topic/legacy prompts
 * are unchanged.
 */
export function conceptClause(input: GenerateQuestionsInput): string {
  if (!input.concepts?.length) return "";
  const names = input.concepts.map((c) => c.name).join(", ");
  return ` Spread the questions across these concepts, and include a "concept" field on each question set to the exact concept name it tests (choose from: ${names}).`;
}
