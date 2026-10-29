import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { retentionOutcome, scheduleNext, type SchedulingState } from "@/lib/learning/sm2";
import { foldConceptMastery } from "@/lib/learning/aggregate";
import { INITIAL_MASTERY, type MasteryState } from "@/lib/learning/mastery";

export const runtime = "nodejs";

const bodySchema = z.object({
  cardId: z.string().uuid(),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export async function POST(req: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ updated: false, reason: "not-configured" });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { cardId, grade } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ updated: false, reason: "no-session" });

    // RLS also enforces ownership; the explicit user_id filter is defence in depth.
    const { data: card } = await supabase
      .from("flashcards")
      .select("reps,ease,interval_days,concept_id")
      .eq("id", cardId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const prev: SchedulingState = {
      reps: card.reps,
      ease: card.ease,
      intervalDays: card.interval_days,
    };
    const next = scheduleNext(prev, grade);
    const dueAt = new Date(Date.now() + next.intervalDays * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("flashcards")
      .update({
        reps: next.reps,
        ease: next.ease,
        interval_days: next.intervalDays,
        due_at: dueAt,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .eq("user_id", user.id);

    // Fold the retention result into the concept's mastery (Phase 6.7).
    const conceptId = card.concept_id as string | null;
    if (conceptId) {
      const { data: row } = await supabase
        .from("concept_mastery")
        .select("mastery,confidence,attempts,correct")
        .eq("user_id", user.id)
        .eq("concept_id", conceptId)
        .maybeSingle();
      const prevMastery: MasteryState = (row as MasteryState | null) ?? INITIAL_MASTERY;
      const nextMastery =
        foldConceptMastery(new Map([[conceptId, prevMastery]]), [
          { conceptId, ...retentionOutcome(grade) },
        ]).get(conceptId) ?? prevMastery;
      await supabase.from("concept_mastery").upsert(
        {
          user_id: user.id,
          concept_id: conceptId,
          mastery: nextMastery.mastery,
          confidence: nextMastery.confidence,
          attempts: nextMastery.attempts,
          correct: nextMastery.correct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,concept_id" },
      );
    }

    return NextResponse.json({ updated: true, dueAt, intervalDays: next.intervalDays });
  } catch {
    return NextResponse.json({ updated: false, reason: "error" }, { status: 500 });
  }
}
