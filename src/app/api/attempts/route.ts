import { NextResponse } from "next/server";
import { z } from "zod";
import { DOMAINS } from "@/lib/domains";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isAnswerCorrect } from "@/lib/learning/scoring";
import { INITIAL_MASTERY, applyOutcomes, type MasteryState } from "@/lib/learning/mastery";
import type { Difficulty } from "@/types/learning";

export const runtime = "nodejs";

const bodySchema = z.object({
  domain: z.string().min(1).max(100),
  difficulty: z.number().int().min(1).max(5),
  answers: z
    .array(
      z.object({
        prompt: z.string().min(1).max(1000),
        selected: z.array(z.number().int().nonnegative()).max(6),
        correctIndices: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(req: Request): Promise<Response> {
  // Degrade gracefully when there's no backend: the quiz UI still shows results.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: "not-configured" });
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

  const { domain, difficulty, answers } = parsed.data;
  if (!DOMAINS.some((d) => d.slug === domain)) {
    return NextResponse.json({ error: "Unknown domain" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ persisted: false, reason: "no-session" });
    }

    // Scoring is recomputed server-side from the provided answer key.
    const outcomes = answers.map((a) => ({
      correct: isAnswerCorrect(a.correctIndices, a.selected),
      difficulty: difficulty as Difficulty,
    }));
    const correct = outcomes.filter((o) => o.correct).length;
    const total = outcomes.length;

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({ user_id: user.id, domain_slug: domain, difficulty, total, correct })
      .select("id")
      .single();
    if (attemptError || !attempt) {
      return NextResponse.json({ persisted: false, reason: "insert-failed" }, { status: 500 });
    }

    await supabase.from("attempt_answers").insert(
      answers.map((a, i) => ({
        attempt_id: attempt.id,
        user_id: user.id,
        prompt: a.prompt,
        selected_indices: a.selected,
        correct_indices: a.correctIndices,
        is_correct: outcomes[i].correct,
      })),
    );

    const { data: existing } = await supabase
      .from("domain_mastery")
      .select("mastery,confidence,attempts,correct")
      .eq("user_id", user.id)
      .eq("domain_slug", domain)
      .maybeSingle();

    const prev: MasteryState = existing ?? INITIAL_MASTERY;
    const next = applyOutcomes(prev, outcomes);

    await supabase.from("domain_mastery").upsert(
      {
        user_id: user.id,
        domain_slug: domain,
        mastery: next.mastery,
        confidence: next.confidence,
        attempts: next.attempts,
        correct: next.correct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain_slug" },
    );

    return NextResponse.json({ persisted: true, attemptId: attempt.id, mastery: next });
  } catch {
    return NextResponse.json({ persisted: false, reason: "error" }, { status: 500 });
  }
}
