/**
 * Consistent difficulty guidelines (Phase 6.6). Difficulty is a property of the
 * *question* — the reasoning it demands — kept separate from the learner's
 * mastery. These descriptions calibrate what each 1–5 level means across every
 * concept, and are fed to the generator so levels are comparable.
 */

import type { Difficulty } from "@/types/learning";

export const DIFFICULTY_GUIDELINES: Record<Difficulty, string> = {
  1: "recall a single fact or definition",
  2: "apply one idea in a straightforward, familiar case",
  3: "a multi-step routine problem, or connecting two ideas",
  4: "analyse a non-obvious case or combine several ideas",
  5: "evaluate, or transfer the idea to an unfamiliar multi-step problem",
};

export function difficultyGuideline(d: Difficulty): string {
  return DIFFICULTY_GUIDELINES[d];
}
