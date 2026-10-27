/**
 * Deterministic grading for written (free-text) answers — the engine's default
 * grader so the app works offline and for free. It measures how many of the
 * reference answer's keywords the learner's answer covers. An LLM grader
 * (`LLMProvider.gradeWritten`) can later override this; the deterministic path
 * remains the fallback.
 */

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "and",
  "or",
  "to",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "by",
  "for",
  "with",
  "as",
  "it",
  "its",
  "into",
  "that",
  "this",
  "these",
  "those",
  "from",
  "but",
  "not",
  "can",
  "will",
  "do",
  "does",
  "has",
  "have",
  "had",
  "than",
  "then",
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** 0..1 fraction of the reference's keywords present in the answer. */
export function gradeWritten(reference: string, answer: string): number {
  const ref = new Set(keywords(reference));
  if (ref.size === 0) return 0;
  const given = new Set(keywords(answer));
  if (given.size === 0) return 0;
  let hit = 0;
  for (const word of ref) if (given.has(word)) hit += 1;
  return Math.min(1, hit / ref.size);
}

export function isWrittenCorrect(score: number, threshold = 0.5): boolean {
  return score >= threshold;
}
