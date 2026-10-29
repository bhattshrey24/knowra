/**
 * Deterministic difficulty recommendation (#3) with progressive cognitive-load
 * management (#14). The user always makes the final choice; this only suggests.
 *
 *   - no history → ease in at level 2 (don't overwhelm a beginner);
 *   - otherwise map mastery to a 1..5 band;
 *   - until confidence is established, hold back the hardest levels so
 *     difficulty rises gradually rather than jumping.
 */

import type { Difficulty } from "@/types/learning";
import { INITIAL_MASTERY, type MasteryState } from "@/lib/learning/mastery";

export function recommendDifficulty(state: MasteryState): Difficulty {
  if (state.attempts === 0) return 2;

  let band: Difficulty;
  if (state.mastery < 0.2) band = 1;
  else if (state.mastery < 0.4) band = 2;
  else if (state.mastery < 0.6) band = 3;
  else if (state.mastery < 0.8) band = 4;
  else band = 5;

  // Progressive load: with low confidence in the estimate, cap the jump.
  if (state.confidence < 0.4 && band > 3) band = 3;

  return band;
}

export interface AdaptiveDifficultyInput {
  /** The learner's mastery for the area (defaults to no history). */
  mastery?: MasteryState;
  /** Accuracy (0..1) over recent attempts, if known. */
  recentAccuracy?: number;
}

/**
 * The adaptive difficulty Knowra uses by default (Phase 6.6): start from the
 * mastery band, then nudge up when recent work is easy and down when it's hard,
 * keeping the progressive-load cap while the estimate is still uncertain. The
 * learner can always override.
 */
export function recommendAdaptiveDifficulty(input: AdaptiveDifficultyInput): Difficulty {
  const state = input.mastery ?? INITIAL_MASTERY;
  let d: number = recommendDifficulty(state);

  if (input.recentAccuracy !== undefined) {
    if (input.recentAccuracy >= 0.85) d += 1;
    else if (input.recentAccuracy < 0.4) d -= 1;
  }

  // Don't leap to the hardest levels until the estimate is trustworthy.
  if (state.confidence < 0.4) d = Math.min(d, 3);

  return Math.max(1, Math.min(5, d)) as Difficulty;
}
