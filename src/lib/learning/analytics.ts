/**
 * Pure analytics derivations over quiz-attempt history. Deterministic and
 * unit-tested; the dashboard renders these without any model involvement.
 */

export interface AttemptLike {
  domainSlug: string;
  total: number;
  correct: number;
  createdAt: string;
}

const accuracyOf = (correct: number, total: number) => (total > 0 ? correct / total : 0);

const byCreatedAtAsc = (a: AttemptLike, b: AttemptLike) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export interface OverallStats {
  totalAttempts: number;
  totalAnswered: number;
  totalCorrect: number;
  /** 0..1 */
  accuracy: number;
}

export function overallStats(attempts: AttemptLike[]): OverallStats {
  const totalAnswered = attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
  return {
    totalAttempts: attempts.length,
    totalAnswered,
    totalCorrect,
    accuracy: accuracyOf(totalCorrect, totalAnswered),
  };
}

export interface AccuracyPoint {
  index: number;
  /** 0..1 */
  accuracy: number;
  createdAt: string;
}

/** Per-attempt accuracy in chronological order (for the trend chart). */
export function accuracyTimeline(attempts: AttemptLike[]): AccuracyPoint[] {
  return [...attempts].sort(byCreatedAtAsc).map((a, index) => ({
    index,
    accuracy: accuracyOf(a.correct, a.total),
    createdAt: a.createdAt,
  }));
}

export interface DomainGain {
  domainSlug: string;
  /** Accuracy of the first attempt in the domain (0..1). */
  baselineAccuracy: number;
  /** Accuracy of the most recent attempt (0..1). */
  latestAccuracy: number;
  /** latest - baseline (learning gain / retention signal, #13). */
  gain: number;
  attempts: number;
}

export function domainGains(attempts: AttemptLike[]): DomainGain[] {
  const byDomain = new Map<string, AttemptLike[]>();
  for (const a of attempts) {
    const list = byDomain.get(a.domainSlug) ?? [];
    list.push(a);
    byDomain.set(a.domainSlug, list);
  }

  return [...byDomain.entries()].map(([domainSlug, list]) => {
    const sorted = [...list].sort(byCreatedAtAsc);
    const baselineAccuracy = accuracyOf(sorted[0].correct, sorted[0].total);
    const last = sorted[sorted.length - 1];
    const latestAccuracy = accuracyOf(last.correct, last.total);
    return {
      domainSlug,
      baselineAccuracy,
      latestAccuracy,
      gain: latestAccuracy - baselineAccuracy,
      attempts: sorted.length,
    };
  });
}
