import "server-only";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { buildStudyFocus, type StudyCandidate } from "@/lib/learning/study-plan";
import {
  DEFAULT_LEARNING_STYLE,
  deriveLearningStyle,
  type AttemptSignal,
} from "@/lib/learning/learning-style";
import { buildLearnerContext } from "@/lib/learning/tutor-context";
import type { Difficulty, LearnerContext, QuestionFormat } from "@/types/learning";

const DAY_MS = 86_400_000;
/** How many recent answers to read when inferring learning style. */
const SIGNAL_LIMIT = 60;

const emptyContext = (): LearnerContext =>
  buildLearnerContext({ style: DEFAULT_LEARNING_STYLE, focus: [] });

function clampDifficulty(n: unknown): Difficulty {
  const v = typeof n === "number" ? n : 2;
  return Math.min(5, Math.max(1, Math.round(v))) as Difficulty;
}

/**
 * Gather the deterministic learner snapshot the AI tutor is allowed to see.
 * Best-effort: without a backend/session, or on any error, it returns a default
 * (empty) context so the assistant still works. All measuring happens here and
 * in the engine — never in the LLM.
 */
export async function gatherLearnerContext(): Promise<LearnerContext> {
  if (!isSupabaseConfigured()) return emptyContext();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return emptyContext();

    const nowIso = new Date().toISOString();
    const [masteryRes, dueRes, signalRes, analogyRes, profileRes] = await Promise.all([
      supabase
        .from("concept_mastery")
        .select("concept_id,mastery,confidence,attempts,correct,updated_at")
        .eq("user_id", user.id),
      supabase.from("flashcards").select("concept_id").eq("user_id", user.id).lte("due_at", nowIso),
      supabase
        .from("attempt_answers")
        .select("written_answer,correct_indices,quiz_attempts(difficulty,domain_slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(SIGNAL_LIMIT),
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "connection"),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);

    const tax = await getTaxonomy();

    // Flashcards currently due, counted per concept.
    const due = new Map<string, number>();
    for (const row of dueRes.data ?? []) {
      const id = row.concept_id as string | null;
      if (id) due.set(id, (due.get(id) ?? 0) + 1);
    }

    // Concept mastery → named study candidates for the focus selector.
    const now = Date.now();
    const candidates: StudyCandidate[] = [];
    let assessed = 0;
    for (const r of masteryRes.data ?? []) {
      const id = r.concept_id as string;
      const attempts = r.attempts as number;
      if (attempts > 0) assessed += 1;
      const updated = new Date(r.updated_at as string).getTime();
      candidates.push({
        conceptId: id,
        conceptName: tax.conceptById.get(id)?.name ?? id,
        state: {
          mastery: r.mastery as number,
          confidence: r.confidence as number,
          attempts,
          correct: r.correct as number,
        },
        lastSeenDaysAgo: Math.max(0, (now - updated) / DAY_MS),
        dueCount: due.get(id),
      });
    }
    // Due concepts with no mastery row yet still deserve a place in the focus.
    for (const [id, count] of due) {
      if (!candidates.some((c) => c.conceptId === id)) {
        candidates.push({
          conceptId: id,
          conceptName: tax.conceptById.get(id)?.name ?? id,
          dueCount: count,
        });
      }
    }
    const focus = buildStudyFocus(candidates);

    // Recent answers → learning-style signals + the subjects they touch.
    const signals: AttemptSignal[] = [];
    const subjects = new Set<string>();
    for (const row of signalRes.data ?? []) {
      const attempt = row.quiz_attempts as { difficulty?: number; domain_slug?: string } | null;
      const written = (row.written_answer as string | null)?.trim();
      const correctIdx = (row.correct_indices as number[] | null) ?? [];
      const format: QuestionFormat = written ? "written" : correctIdx.length > 1 ? "multi" : "mcq";
      signals.push({
        format,
        difficulty: clampDifficulty(attempt?.difficulty),
        answerWords: written ? written.split(/\s+/).filter(Boolean).length : undefined,
      });
      const slug = attempt?.domain_slug;
      if (slug) subjects.add(tax.subjectById.get(slug)?.name ?? slug);
    }
    const style = deriveLearningStyle(signals, { analogyFlashcards: analogyRes.count ?? 0 });

    return buildLearnerContext({
      displayName:
        (profileRes.data?.display_name as string | null) ??
        (user.user_metadata?.display_name as string | undefined),
      style,
      focus,
      subjects: [...subjects],
      assessedConcepts: assessed,
    });
  } catch {
    // Table missing / not seeded / transient error — degrade to empty context.
    return emptyContext();
  }
}
