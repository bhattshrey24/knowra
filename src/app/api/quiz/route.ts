import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm/provider";
import { MockLLMProvider } from "@/lib/llm/mock";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { allocateFormatCounts, interleaveByFormat } from "@/lib/learning/quiz-composition";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { conceptsForScope, subjectsOfConcept, type Taxonomy } from "@/lib/learning/taxonomy";
import { assignConceptIds, type AllowedConcept } from "@/lib/learning/concept-tagging";
import { selectConceptsForQuiz } from "@/lib/learning/concept-selection";
import { planDiagnostic } from "@/lib/learning/diagnostic";
import { fetchConceptMastery } from "@/lib/db/concept-mastery-server";
import type { TaxonomyLevel } from "@/types/learning";
import { rateLimit } from "@/lib/rate-limit";
import type { Difficulty, Question, QuestionFormat } from "@/types/learning";

export const runtime = "nodejs";

const bodySchema = z.object({
  domain: z.string().min(1).max(100),
  difficulty: z.number().int().min(1).max(5),
  count: z.number().int().min(1).max(30).default(5),
  // One or more formats; a multi-format quiz is a round-robin mix of them.
  // `format` (singular) is still accepted for backwards compatibility.
  formats: z
    .array(z.enum(["mcq", "multi", "written"]))
    .min(1)
    .max(3)
    .optional(),
  format: z.enum(["mcq", "multi", "written"]).optional(),
  // Optional narrower scope within the subject (Phase 6.1 navigation): quiz a
  // single topic or concept. Ignored if it doesn't belong to `domain`.
  scope: z
    .object({ level: z.enum(["topic", "concept"]), id: z.string().min(1).max(100) })
    .optional(),
  // Diagnostic mode (Phase 6.5): probe the area's unassessed concepts to
  // calibrate, rather than the usual balanced selection.
  diagnostic: z.boolean().optional(),
});

type GenInput = {
  conceptName: string;
  topicName: string;
  domainName: string;
  difficulty: Difficulty;
  count: number;
  concepts?: AllowedConcept[];
};

function toAllowed(ids: string[], tax: Taxonomy): AllowedConcept[] {
  return ids
    .map((cid) => tax.conceptById.get(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name }));
}

/**
 * The taxonomy concepts a quiz draws from. A concept scope is just that
 * concept; a subject or topic scope is a *balanced* selection of its concepts
 * — weak, unassessed, and retention-due (Phase 6.2) — sized to the quiz. Empty
 * for custom topics (not in the taxonomy).
 */
async function conceptsForQuiz(
  subjectSlug: string,
  count: number,
  scope?: { level: "topic" | "concept"; id: string },
  diagnostic?: boolean,
): Promise<AllowedConcept[]> {
  const tax = await getTaxonomy();

  let level: TaxonomyLevel = "subject";
  let id = subjectSlug;
  if (scope?.level === "topic" && tax.topicById.get(scope.id)?.subjectId === subjectSlug) {
    level = "topic";
    id = scope.id;
  } else if (scope?.level === "concept" && subjectsOfConcept(tax, scope.id).includes(subjectSlug)) {
    level = "concept";
    id = scope.id;
  }

  const scopeConceptIds = conceptsForScope(tax, level, id);
  if (scopeConceptIds.length === 0) return [];
  if (level === "concept") return toAllowed(scopeConceptIds, tax);

  // Subject / topic: select by the learner's concept mastery.
  const mastery = await fetchConceptMastery(scopeConceptIds);
  const candidates = scopeConceptIds.map((cid) => ({
    id: cid,
    state: mastery.get(cid)?.state,
    lastSeenDaysAgo: mastery.get(cid)?.lastSeenDaysAgo,
  }));

  // Diagnostic: probe the unassessed concepts to calibrate. Otherwise balance
  // weak / unassessed / retention.
  const selectedIds = diagnostic
    ? planDiagnostic(candidates, count).map((p) => p.conceptId)
    : selectConceptsForQuiz(candidates, count).map((s) => s.id);

  // A diagnostic on an already-covered area may have nothing to probe — fall
  // back to a balanced selection so the quiz is never empty.
  const ids =
    selectedIds.length > 0
      ? selectedIds
      : selectConceptsForQuiz(candidates, count).map((s) => s.id);
  return toAllowed(ids, tax);
}

/**
 * Max questions requested per LLM call. Large quizzes are generated in several
 * small sequential calls instead of one big one, so no single call runs long
 * enough to time out — important for slow local models, where one oversized
 * request would exceed the provider timeout and dead-end the whole quiz.
 */
const MAX_PER_CALL = 6;

/**
 * Generate a mixed-format quiz: split the count across the selected formats
 * (deterministically), generate each format in small sequential chunks, then
 * interleave so the formats alternate. Sequential (not parallel) so a
 * single-instance local model isn't asked to run several generations at once.
 */
async function generateMix(
  provider: LLMProvider,
  base: GenInput,
  formats: QuestionFormat[],
): Promise<Awaited<ReturnType<LLMProvider["generateQuestions"]>>> {
  const counts = allocateFormatCounts(base.count, formats);
  const all: Awaited<ReturnType<LLMProvider["generateQuestions"]>> = [];

  for (const [format, count] of Object.entries(counts)) {
    let remaining = count;
    while (remaining > 0) {
      const chunk = Math.min(remaining, MAX_PER_CALL);
      const batch = await provider.generateQuestions({
        ...base,
        formats: [format as QuestionFormat],
        count: chunk,
      });
      all.push(...batch);
      remaining -= chunk;
    }
  }

  // Interleave and cap to the requested count (models can over-generate).
  return interleaveByFormat(all, base.count, formats).slice(0, base.count);
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anon";
}

export async function POST(req: Request): Promise<Response> {
  const limit = rateLimit(`quiz:${clientKey(req)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { domain, difficulty, count, scope, diagnostic } = parsed.data;
  // Prefer the array; fall back to the legacy singular field, then default mcq.
  const formats: QuestionFormat[] = parsed.data.formats ?? [parsed.data.format ?? "mcq"];
  const learnable = await resolveLearnable(domain);
  if (!learnable) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
  }

  // Scope a predefined subject (optionally narrowed to a topic/concept) to its
  // taxonomy concepts so every question maps to one (Phase 6.1). Custom topics
  // aren't in the taxonomy — they keep their own slug as the concept id.
  const allowedConcepts = learnable.isCustom
    ? []
    : await conceptsForQuiz(learnable.slug, count, scope, diagnostic);

  const provider = getLLMProvider();
  const genInput: GenInput = {
    conceptName: learnable.name,
    topicName: learnable.name,
    domainName: learnable.name,
    difficulty: difficulty as Difficulty,
    count,
    concepts: allowedConcepts.length > 0 ? allowedConcepts : undefined,
  };

  let generated;
  let usedProvider = provider.id;
  let fallback = false;
  try {
    generated = await generateMix(provider, genInput, formats);
  } catch (err) {
    // Server log (no secrets in these messages) so the cause is visible in logs.
    console.error(`[quiz] generation failed (provider=${provider.id}):`, (err as Error)?.message);
    if (provider.id === "mock") {
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 502 });
    }
    // Graceful fallback: a flaky LLM shouldn't dead-end the quiz. Serve instant
    // practice questions, clearly flagged so the UI can tell the learner.
    try {
      generated = await generateMix(new MockLLMProvider(), genInput, formats);
      usedProvider = "mock-fallback";
      fallback = true;
    } catch {
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 502 });
    }
  }

  // Resolve each question's model-proposed concept label to a validated concept
  // id; fall back to the learnable's own slug when it isn't in the taxonomy.
  const conceptIds = assignConceptIds(
    generated.map((g) => g.conceptLabel),
    allowedConcepts,
  );
  const questions: Question[] = generated.map((g, i) => {
    // Drop the transient concept label once resolved; it isn't part of Question.
    const question: Question & { conceptLabel?: string } = {
      ...g,
      id: randomUUID(),
      conceptId: conceptIds ? conceptIds[i] : learnable.slug,
    };
    delete question.conceptLabel;
    return question;
  });

  return NextResponse.json({
    domain: learnable.slug,
    difficulty,
    provider: usedProvider,
    fallback,
    questions,
  });
}
