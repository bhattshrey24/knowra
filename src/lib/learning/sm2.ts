/**
 * SM-2 spaced-repetition scheduling — deterministic, LLM-independent, and
 * unit-tested. Given a card's current schedule and the learner's recall grade,
 * it returns the next schedule (repetition count, ease factor, interval in
 * days). The caller turns `intervalDays` into a concrete `due_at`.
 *
 * Reference: the SuperMemo SM-2 algorithm. FSRS is a documented upgrade path
 * in improve.md.
 */

export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** Maps the UI's four buttons to SM-2 quality scores (0..5); <3 is a lapse. */
const QUALITY: Record<ReviewGrade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export interface SchedulingState {
  reps: number;
  ease: number;
  intervalDays: number;
}

export const INITIAL_SCHEDULING: SchedulingState = { reps: 0, ease: 2.5, intervalDays: 0 };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scheduleNext(prev: SchedulingState, grade: ReviewGrade): SchedulingState {
  const q = QUALITY[grade];

  // Ease factor update (applies on every review), floored at 1.3.
  let ease = prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  let reps: number;
  let intervalDays: number;

  if (q < 3) {
    // Lapse: relearn from the start.
    reps = 0;
    intervalDays = 1;
  } else if (prev.reps === 0) {
    reps = 1;
    intervalDays = 1;
  } else if (prev.reps === 1) {
    reps = 2;
    intervalDays = 6;
  } else {
    reps = prev.reps + 1;
    intervalDays = Math.round(prev.intervalDays * ease);
  }

  return { reps, ease: round2(ease), intervalDays };
}
