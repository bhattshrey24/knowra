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
import type { MasteryState } from "@/lib/learning/mastery";

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
