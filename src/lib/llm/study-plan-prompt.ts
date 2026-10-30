/**
 * Shared prompt for study-plan generation (Gemini + Ollama). The engine has
 * already chosen the concepts and why; the model only narrates and orders them.
 * The prompt lists each concept with its id and status and forbids introducing
 * anything else — and the caller still guardrails the result with zod.
 */

import type { GenerateStudyPlanInput } from "@/lib/llm/provider";

const STATUS_HINT: Record<string, string> = {
  weak: "answered shakily — strengthen",
  unassessed: "not yet assessed — learn",
  due: "due for spaced review — review",
  strong: "solid — keep sharp",
};

/** Build the prompt and the `conceptId → authoritative name` allow-map. */
export function buildStudyPlanPrompt(input: GenerateStudyPlanInput): {
  prompt: string;
  allowedById: Map<string, string>;
} {
  const allowedById = new Map(input.focus.map((f) => [f.conceptId, f.conceptName]));
  const list = input.focus
    .map((f) => {
      const mastery = f.mastery != null ? `, mastery ${Math.round(f.mastery * 100)}%` : "";
      const due = f.dueCount ? `, ${f.dueCount} due` : "";
      return `- ${f.conceptName} [id: ${f.conceptId}] — ${STATUS_HINT[f.status] ?? f.status}${mastery}${due}`;
    })
    .join("\n");

  const prompt = [
    `You are a supportive study coach. The learner is working on "${input.subjectName}".`,
    `The system has already selected the concepts below to focus on next:`,
    list,
    ``,
    `Write a short, encouraging study plan. Rules:`,
    `- Reference ONLY the concepts listed above, by their exact id.`,
    `- One step per concept. For each, choose action = "learn" (new), "strengthen" (weak), or "review" (due), and give a one-sentence reason.`,
    `- Keep "overview" to 1-2 sentences. Do not invent concepts, scores, or topics.`,
    `Respond as JSON: { overview, steps: [{ conceptId, action, reason }], encouragement }.`,
  ].join("\n");

  return { prompt, allowedById };
}
