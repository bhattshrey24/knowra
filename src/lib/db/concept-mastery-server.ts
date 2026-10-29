import "server-only";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MasteryState } from "@/lib/learning/mastery";

export interface ConceptMasteryInfo {
  state: MasteryState;
  lastSeenDaysAgo: number;
}

const DAY_MS = 86_400_000;

/**
 * The current user's mastery for a set of concepts, keyed by concept id.
 * Best-effort: returns an empty map without a backend/session, so callers
 * (e.g. balanced quiz selection) degrade to treating everything as unassessed.
 */
export async function fetchConceptMastery(
  conceptIds: string[],
): Promise<Map<string, ConceptMasteryInfo>> {
  const out = new Map<string, ConceptMasteryInfo>();
  if (!isSupabaseConfigured() || conceptIds.length === 0) return out;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return out;

    const { data } = await supabase
      .from("concept_mastery")
      .select("concept_id,mastery,confidence,attempts,correct,updated_at")
      .eq("user_id", user.id)
      .in("concept_id", conceptIds);

    const now = Date.now();
    for (const r of data ?? []) {
      const updated = new Date(r.updated_at as string).getTime();
      out.set(r.concept_id as string, {
        state: {
          mastery: r.mastery as number,
          confidence: r.confidence as number,
          attempts: r.attempts as number,
          correct: r.correct as number,
        },
        lastSeenDaysAgo: Math.max(0, (now - updated) / DAY_MS),
      });
    }
  } catch {
    // Table missing / not seeded / transient error — degrade to no mastery.
  }
  return out;
}
