import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm/provider";
import { MockLLMProvider } from "@/lib/llm/mock";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { allocateFormatCounts, interleaveByFormat } from "@/lib/learning/quiz-composition";
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
});

type GenInput = {
  conceptName: string;
  topicName: string;
  domainName: string;
  difficulty: Difficulty;
  count: number;
};

/**
 * Generate a mixed-format quiz: split the count across the selected formats
 * (deterministically), request each batch from the provider in parallel, then
 * interleave so the formats alternate. Reuses each provider's existing
 * single-format generation path unchanged.
 */
async function generateMix(
  provider: LLMProvider,
  base: GenInput,
  formats: QuestionFormat[],
): Promise<Awaited<ReturnType<LLMProvider["generateQuestions"]>>> {
  const counts = allocateFormatCounts(base.count, formats);
  const batches = await Promise.all(
    Object.entries(counts).map(([format, count]) =>
      provider.generateQuestions({ ...base, formats: [format as QuestionFormat], count }),
    ),
  );
  return interleaveByFormat(batches.flat(), base.count, formats);
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

  const { domain, difficulty, count } = parsed.data;
  // Prefer the array; fall back to the legacy singular field, then default mcq.
  const formats: QuestionFormat[] = parsed.data.formats ?? [parsed.data.format ?? "mcq"];
  const learnable = await resolveLearnable(domain);
  if (!learnable) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
  }

  const provider = getLLMProvider();
  const genInput: GenInput = {
    conceptName: learnable.name,
    topicName: learnable.name,
    domainName: learnable.name,
    difficulty: difficulty as Difficulty,
    count,
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

  const questions: Question[] = generated.map((g) => ({
    ...g,
    id: randomUUID(),
    conceptId: learnable.slug,
  }));

  return NextResponse.json({
    domain: learnable.slug,
    difficulty,
    provider: usedProvider,
    fallback,
    questions,
  });
}
