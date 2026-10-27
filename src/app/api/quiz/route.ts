import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DOMAINS } from "@/lib/domains";
import { getLLMProvider } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import type { Difficulty, Question } from "@/types/learning";

export const runtime = "nodejs";

const bodySchema = z.object({
  domain: z.string().min(1).max(100),
  difficulty: z.number().int().min(1).max(5),
  count: z.number().int().min(1).max(10).default(5),
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

  const { domain, difficulty, count } = parsed.data;
  const found = DOMAINS.find((d) => d.slug === domain);
  if (!found) {
    return NextResponse.json({ error: "Unknown domain" }, { status: 404 });
  }

  const provider = getLLMProvider();
  let generated;
  try {
    generated = await provider.generateQuestions({
      conceptName: found.name,
      topicName: found.name,
      domainName: found.name,
      difficulty: difficulty as Difficulty,
      formats: ["mcq"],
      count,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 502 });
  }

  const questions: Question[] = generated.map((g) => ({
    ...g,
    id: randomUUID(),
    conceptId: found.slug,
  }));

  return NextResponse.json({ domain: found.slug, difficulty, provider: provider.id, questions });
}
