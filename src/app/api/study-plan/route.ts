import { NextResponse } from "next/server";
import { z } from "zod";
import { getLLMProvider } from "@/lib/llm";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { conceptsForScope } from "@/lib/learning/taxonomy";
import { fetchConceptMastery } from "@/lib/db/concept-mastery-server";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { buildStudyFocus, fallbackStudyPlan, type StudyCandidate } from "@/lib/learning/study-plan";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/study-plan");

const bodySchema = z.object({ subject: z.string().min(1).max(100) });

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * Count flashcards currently due per concept for the signed-in user. Best-effort
 * — returns an empty map without a backend/session or on any error, so the plan
 * still works offline.
 */
async function dueCountsByConcept(conceptIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!isSupabaseConfigured() || conceptIds.length === 0) return out;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return out;
    const { data } = await supabase
      .from("flashcards")
      .select("concept_id")
      .eq("user_id", user.id)
      .in("concept_id", conceptIds)
      .lte("due_at", new Date().toISOString());
    for (const row of data ?? []) {
      const id = row.concept_id as string | null;
      if (id) out.set(id, (out.get(id) ?? 0) + 1);
    }
  } catch {
    // degrade to no due info
  }
  return out;
}

/**
 * AI study-plan advisor (guardrailed). The deterministic engine selects which
 * concepts to focus on (weak / unassessed / due) and why; the LLM only turns
 * those facts into a readable plan, referencing only the given concepts. On any
 * LLM failure we return the deterministic plan, so this endpoint never fails.
 */
export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`study-plan:${clientKey(req)}`).ok) {
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

  const learnable = await resolveLearnable(parsed.data.subject);
  if (!learnable) return NextResponse.json({ error: "Unknown subject" }, { status: 404 });

  // Custom topics have no taxonomy concepts to plan over.
  if (learnable.isCustom) {
    return NextResponse.json({
      plan: fallbackStudyPlan(learnable.name, []),
      aiGenerated: false,
      provider: "none",
    });
  }

  const tax = await getTaxonomy();
  const conceptIds = conceptsForScope(tax, "subject", learnable.slug);
  const [mastery, due] = await Promise.all([
    fetchConceptMastery(conceptIds),
    dueCountsByConcept(conceptIds),
  ]);

  const candidates: StudyCandidate[] = conceptIds.map((id) => ({
    conceptId: id,
    conceptName: tax.conceptById.get(id)?.name ?? id,
    state: mastery.get(id)?.state,
    lastSeenDaysAgo: mastery.get(id)?.lastSeenDaysAgo,
    dueCount: due.get(id),
  }));
  const focus = buildStudyFocus(candidates);

  // No concepts to plan over → deterministic "all caught up" plan.
  if (focus.length === 0) {
    return NextResponse.json({
      plan: fallbackStudyPlan(learnable.name, focus),
      aiGenerated: false,
      provider: "none",
    });
  }

  const provider = getLLMProvider();
  try {
    const plan = await provider.generateStudyPlan({ subjectName: learnable.name, focus });
    log.info("study plan generated", {
      subject: learnable.slug,
      provider: provider.id,
      steps: plan.steps.length,
    });
    return NextResponse.json({ plan, aiGenerated: true, provider: provider.id });
  } catch (err) {
    // The engine's facts are still valid — fall back to a deterministic plan.
    log.warn("llm study plan failed, using deterministic fallback", {
      subject: learnable.slug,
      provider: provider.id,
      ...errorContext(err),
    });
    return NextResponse.json({
      plan: fallbackStudyPlan(learnable.name, focus),
      aiGenerated: false,
      provider: "fallback",
    });
  }
}
