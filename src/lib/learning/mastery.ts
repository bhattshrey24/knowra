/**
 * Deterministic mastery estimation — part of the LLM-independent learning
 * engine. Mastery is a 0..1 estimate updated from quiz outcomes with a simple,
 * transparent rule (no model involved):
 *
 *   - a correct answer moves mastery toward 1, more so for harder questions;
 *   - a wrong answer moves it toward 0, more so for easier questions;
 *   - the step shrinks as mastery approaches its bound (diminishing returns).
 *
 * Confidence grows with the number of attempts. Everything here is pure and
 * unit-tested, which is what lets the knowledge profile be provider-agnostic.
 */

import type { Difficulty } from "@/types/learning";

export interface MasteryState {
  /** 0..1 estimated mastery. */
  mastery: number;
  /** 0..1 confidence in the estimate (grows with attempts). */
  confidence: number;
  attempts: number;
  correct: number;
}

export const INITIAL_MASTERY: MasteryState = {
  mastery: 0,
  confidence: 0,
  attempts: 0,
  correct: 0,
};

/** Attempts needed for full confidence. */
const CONFIDENCE_SATURATION = 20;
const LEARNING_RATE = 0.25;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface Outcome {
  correct: boolean;
  difficulty: Difficulty;
}

export function updateMastery(prev: MasteryState, outcome: Outcome): MasteryState {
  const { correct, difficulty } = outcome;
  const delta = correct
    ? LEARNING_RATE * (difficulty / 5) * (1 - prev.mastery)
    : -LEARNING_RATE * ((6 - difficulty) / 5) * prev.mastery;

  const attempts = prev.attempts + 1;
  return {
    mastery: clamp01(prev.mastery + delta),
    confidence: Math.min(1, attempts / CONFIDENCE_SATURATION),
    attempts,
    correct: prev.correct + (correct ? 1 : 0),
  };
}

/** Fold a sequence of outcomes (e.g. one quiz) into a mastery state. */
export function applyOutcomes(prev: MasteryState, outcomes: Outcome[]): MasteryState {
  return outcomes.reduce(updateMastery, prev);
}

/** Present mastery as a 0..10 score for the knowledge profile (e.g. "Math 4/10"). */
export function masteryOutOfTen(state: MasteryState): number {
  return Math.round(state.mastery * 10);
}
