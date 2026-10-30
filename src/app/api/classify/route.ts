import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider } from "@/lib/llm";
import { MockLLMProvider } from "@/lib/llm/mock";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { resolveClassification } from "@/lib/learning/classify";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/classify");

const bodySchema = z.object({ query: z.string().min(2).max(100) });

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * Propose where a free-text learning request fits in the taxonomy (Phase 6.3):
 * the LLM suggests a Subject → Topic → Concept, then the deterministic engine
 * resolves it against existing nodes (reuse vs. new) and flags duplicates. This
 * only proposes — nothing is saved until the user confirms via /api/learn.
 */
export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`classify:${clientKey(req)}`).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const query = parsed.data.query.replace(/\s+/g, " ").trim();
  const tax = await getTaxonomy();
  const subjects = tax.subjects.map((s) => s.name);

  const provider = getLLMProvider();
  let proposed;
  try {
    proposed = await provider.classify({ query, subjects });
  } catch (err) {
    log.warn("classify failed, using mock fallback", {
      provider: provider.id,
      ...errorContext(err),
    });
    proposed = await new MockLLMProvider().classify({ query, subjects });
  }

  return NextResponse.json({ classification: resolveClassification(proposed, tax) });
}
