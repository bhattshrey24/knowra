import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { resolveLearnable, customTitleMap } from "@/lib/db/learnable-server";
import { isSupabaseConfigured } from "@/lib/env";
import { getLLMProvider } from "@/lib/llm";
import { predefinedLearnable } from "@/lib/learnable";
import { isAnswerCorrect } from "@/lib/learning/scoring";
import { gradeWritten, isWrittenCorrect } from "@/lib/learning/grade-written";
import { INITIAL_MASTERY, applyOutcomes, type MasteryState } from "@/lib/learning/mastery";
import { foldConceptMastery, type ConceptOutcome } from "@/lib/learning/aggregate";
import { buildFlashcardsFromQuiz } from "@/lib/learning/flashcards";
import { pickAnalogyAnchor } from "@/lib/learning/connections";
import type { Difficulty } from "@/types/learning";

export const runtime = "nodejs";

const bodySchema = z.object({
  domain: z.string().min(1).max(100),
  difficulty: z.number().int().min(1).max(5),
  answers: z
    .array(
      z.object({
        prompt: z.string().min(1).max(1000),
        conceptId: z.string().min(1).max(100).optional(),
        format: z.enum(["mcq", "multi", "written"]).default("mcq"),
        options: z.array(z.string().min(1).max(500)).max(6).optional(),
        selected: z.array(z.number().int().nonnegative()).max(6).optional(),
        correctIndices: z.array(z.number().int().nonnegative()).max(6).optional(),
        explanation: z.string().max(2000).optional(),
        writtenAnswer: z.string().max(5000).optional(),
        referenceAnswer: z.string().max(2000).optional(),
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

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ persisted: false, reason: "no-session" });
    }

    const learnable = await resolveLearnable(domain);
    if (!learnable) {
      return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
    }

    // Scoring is recomputed server-side from the provided answer key / reference.
    const outcomes = answers.map((a) => ({
      correct:
        a.format === "written"
          ? isWrittenCorrect(gradeWritten(a.referenceAnswer ?? "", a.writtenAnswer ?? ""))
          : isAnswerCorrect(a.correctIndices ?? [], a.selected ?? []),
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
        concept_id: a.conceptId ?? null,
        selected_indices: a.selected ?? [],
        correct_indices: a.correctIndices ?? [],
        is_correct: outcomes[i].correct,
        written_answer: a.writtenAnswer ?? null,
        reference_answer: a.referenceAnswer ?? null,
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

    // Concept-level mastery (Phase 6.2): fold each tagged answer's outcome into
    // its concept, so topic/subject stats can be aggregated from real evidence.
    const conceptOutcomes: ConceptOutcome[] = answers.flatMap((a, i) =>
      a.conceptId
        ? [
            {
              conceptId: a.conceptId,
              correct: outcomes[i].correct,
              difficulty: difficulty as Difficulty,
            },
          ]
        : [],
    );
    if (conceptOutcomes.length > 0) {
      const ids = [...new Set(conceptOutcomes.map((o) => o.conceptId))];
      const { data: rows } = await supabase
        .from("concept_mastery")
        .select("concept_id,mastery,confidence,attempts,correct")
        .eq("user_id", user.id)
        .in("concept_id", ids);
      const prevByConcept = new Map<string, MasteryState>(
        (rows ?? []).map((r) => [
          r.concept_id as string,
          {
            mastery: r.mastery as number,
            confidence: r.confidence as number,
            attempts: r.attempts as number,
            correct: r.correct as number,
          },
        ]),
      );
      const nextByConcept = foldConceptMastery(prevByConcept, conceptOutcomes);
      const now = new Date().toISOString();
      await supabase.from("concept_mastery").upsert(
        ids.map((id) => {
          const s = nextByConcept.get(id) ?? INITIAL_MASTERY;
          return {
            user_id: user.id,
            concept_id: id,
            mastery: s.mastery,
            confidence: s.confidence,
            attempts: s.attempts,
            correct: s.correct,
            updated_at: now,
          };
        }),
        { onConflict: "user_id,concept_id" },
      );
    }

    // Generate revision flashcards (weakness + foundational), de-duplicated
    // against cards the user already has for this domain.
    const built = buildFlashcardsFromQuiz(answers);
    if (built.length > 0) {
      const { data: existingCards } = await supabase
        .from("flashcards")
        .select("front")
        .eq("user_id", user.id)
        .eq("domain_slug", domain);
      const seen = new Set((existingCards ?? []).map((c) => c.front as string));
      const toInsert = built
        .filter((card) => {
          if (seen.has(card.front)) return false;
          seen.add(card.front);
          return true;
        })
        .map((card) => ({
          user_id: user.id,
          domain_slug: domain,
          type: card.type,
          front: card.front,
          back: card.back,
        }));
      if (toInsert.length > 0) await supabase.from("flashcards").insert(toInsert);
    }

    // Cross-domain connection card (#10): if the learner slipped here and has a
    // subject they already know well, generate an analogy linking the two.
    if (outcomes.some((o) => !o.correct)) {
      const { data: masteryRows } = await supabase
        .from("domain_mastery")
        .select("domain_slug,mastery,attempts")
        .eq("user_id", user.id);
      const anchorSlug = pickAnalogyAnchor(
        domain,
        (masteryRows ?? []).map((m) => ({
          slug: m.domain_slug as string,
          mastery: m.mastery as number,
          attempts: m.attempts as number,
        })),
      );
      if (anchorSlug) {
        const anchorName =
          predefinedLearnable(anchorSlug)?.name ??
          (await customTitleMap()).get(anchorSlug) ??
          anchorSlug;
        try {
          const cards = await getLLMProvider().generateFlashcards({
            concept: { name: learnable.name },
            type: "connection",
            analogyAnchor: anchorName,
          });
          const { data: existing } = await supabase
            .from("flashcards")
            .select("front")
            .eq("user_id", user.id)
            .eq("domain_slug", domain);
          const seen = new Set((existing ?? []).map((c) => c.front as string));
          const toInsert = cards
            .filter((c) => !seen.has(c.front))
            .map((c) => ({
              user_id: user.id,
              domain_slug: domain,
              type: c.type,
              front: c.front,
              back: c.back,
            }));
          if (toInsert.length > 0) await supabase.from("flashcards").insert(toInsert);
        } catch {
          // best-effort: a connection card is a bonus, never fails the attempt
        }
      }
    }

    return NextResponse.json({ persisted: true, attemptId: attempt.id, mastery: next });
  } catch {
    return NextResponse.json({ persisted: false, reason: "error" }, { status: 500 });
  }
}
