import { NextResponse } from "next/server";
import { getLLMProvider } from "@/lib/llm";
import { gatherLearnerContext } from "@/lib/db/learner-profile-server";
import { fallbackReply } from "@/lib/learning/tutor-context";
import { tutorRequestSchema } from "@/lib/validation/tutor";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/chat");

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * AI learning assistant (profile-aware tutor). The deterministic engine builds
 * an authoritative snapshot of the learner (weak spots, due reviews, learning
 * style); the LLM only phrases a grounded reply in that style. On any LLM
 * failure we return a deterministic reply built from the same facts, so the
 * assistant never dead-ends. Both the request and the model reply are treated
 * as untrusted and validated.
 */
export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`chat:${clientKey(req)}`).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = tutorRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { message, history } = parsed.data;
  const context = await gatherLearnerContext();
  const provider = getLLMProvider();

  try {
    const reply = await provider.tutorReply({ message, history, context });
    log.info("tutor reply generated", { provider: provider.id, focus: context.focus.length });
    return NextResponse.json({
      reply,
      // The mock provider's reply is the deterministic template, not real AI.
      aiGenerated: provider.id !== "mock",
      provider: provider.id,
    });
  } catch (err) {
    // The engine's facts are still valid — answer deterministically.
    log.warn("llm tutor reply failed, using deterministic fallback", {
      provider: provider.id,
      ...errorContext(err),
    });
    return NextResponse.json({
      reply: fallbackReply(message, context),
      aiGenerated: false,
      provider: "fallback",
    });
  }
}
