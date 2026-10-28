import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider } from "@/lib/llm";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { rateLimit } from "@/lib/rate-limit";
import type { Difficulty, Question } from "@/types/learning";

export const runtime = "nodejs";

const bodySchema = z.object({
  domain: z.string().min(1).max(100),
  difficulty: z.number().int().min(1).max(5),
  count: z.number().int().min(1).max(10).default(5),
  format: z.enum(["mcq", "multi", "written"]).default("mcq"),
});

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

  const { domain, difficulty, count, format } = parsed.data;
  const learnable = await resolveLearnable(domain);
  if (!learnable) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
  }

  const provider = getLLMProvider();
  let generated;
  try {
    generated = await provider.generateQuestions({
      conceptName: learnable.name,
      topicName: learnable.name,
      domainName: learnable.name,
      difficulty: difficulty as Difficulty,
      formats: [format],
      count,
    });
  } catch (err) {
    // Server log (no secrets in these messages) so the cause is visible in dev/Vercel logs.
    console.error(`[quiz] generation failed (provider=${provider.id}):`, (err as Error)?.message);
    return NextResponse.json(
      { error: "Failed to generate questions", detail: (err as Error)?.message },
      { status: 502 },
    );
  }

  const questions: Question[] = generated.map((g) => ({
    ...g,
    id: randomUUID(),
    conceptId: learnable.slug,
  }));

  return NextResponse.json({
    domain: learnable.slug,
    difficulty,
    provider: provider.id,
    questions,
  });
}
