/**
 * Learning-style engine. Deterministic and LLM-independent: it *observes* how a
 * learner engages — which question format they use, at what difficulty, how much
 * they write — and derives a small style profile. The AI tutor is later told to
 * answer in this style, but the LLM never decides the style itself.
 */

import type { Difficulty, LearningStyle, QuestionFormat } from "@/types/learning";

/** One past answer, reduced to the signals that reveal how a learner engages. */
export interface AttemptSignal {
  format: QuestionFormat;
  difficulty: Difficulty;
  /** Word count of a written answer, when this was a written question. */
  answerWords?: number;
}

/** Attempts needed before the style profile is fully confident. */
export const STYLE_SATURATION = 15;
/** A written answer averaging this many words signals a learner who elaborates. */
export const DETAILED_WORDS = 20;

export const DEFAULT_LEARNING_STYLE: LearningStyle = {
  preferredFormat: "mcq",
  verbosity: "concise",
  level: 2,
  likesAnalogies: false,
  confidence: 0,
};

function clampDifficulty(n: number): Difficulty {
  return Math.min(5, Math.max(1, Math.round(n))) as Difficulty;
}

/**
 * Derive the learner's style from their attempt history, and optionally how many
 * cross-domain analogy flashcards they've engaged with. Pure: same inputs → same
 * output. Falls back to a sensible default when there's no history.
 */
export function deriveLearningStyle(
  signals: AttemptSignal[],
  opts: { analogyFlashcards?: number } = {},
): LearningStyle {
  const likesAnalogies = (opts.analogyFlashcards ?? 0) > 0;
  if (signals.length === 0) {
    return { ...DEFAULT_LEARNING_STYLE, likesAnalogies };
  }

  // Preferred format = the one used most. Ties resolve to the richer format
  // (written > multi > mcq), since that's the stronger signal of engagement.
  const counts: Record<QuestionFormat, number> = { mcq: 0, multi: 0, written: 0 };
  for (const s of signals) counts[s.format] += 1;
  let preferredFormat: QuestionFormat = "mcq";
  let best = -1;
  for (const f of ["written", "multi", "mcq"] as const) {
    if (counts[f] > best) {
      best = counts[f];
      preferredFormat = f;
    }
  }

  // Verbosity: written-leaning learners, or those who write long answers, get
  // fuller replies; everyone else gets concise ones.
  const written = signals.filter((s) => s.answerWords != null);
  const avgWords = written.length
    ? written.reduce((sum, s) => sum + (s.answerWords ?? 0), 0) / written.length
    : 0;
  const verbosity: LearningStyle["verbosity"] =
    preferredFormat === "written" || avgWords >= DETAILED_WORDS ? "detailed" : "concise";

  const level = clampDifficulty(signals.reduce((sum, s) => sum + s.difficulty, 0) / signals.length);

  return {
    preferredFormat,
    verbosity,
    level,
    likesAnalogies,
    confidence: Math.min(1, signals.length / STYLE_SATURATION),
  };
}
