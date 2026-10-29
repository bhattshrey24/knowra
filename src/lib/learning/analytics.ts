/**
 * Pure analytics derivations over quiz-attempt history. Deterministic and
 * unit-tested; the dashboard renders these without any model involvement.
 */

import type { MasteryState } from "@/lib/learning/mastery";
import { MIN_EVIDENCE } from "@/lib/learning/concept-selection";

export interface AttemptLike {
  domainSlug: string;
  total: number;
  correct: number;
  createdAt: string;
}

export interface AttemptWithDifficulty extends AttemptLike {
  difficulty?: number;
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

/** Per-attempt accuracy in chronological order (for the trend chart). Optionally filtered by subject. */
export function accuracyTimeline(
  attempts: AttemptLike[],
  filterDomainSlug?: string,
): AccuracyPoint[] {
  const filtered = filterDomainSlug
    ? attempts.filter((a) => a.domainSlug === filterDomainSlug)
    : attempts;

  return [...filtered].sort(byCreatedAtAsc).map((a, index) => ({
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

export interface DifficultyAccuracy {
  difficulty: 1 | 2 | 3 | 4 | 5;
  attempts: number;
  totalQuestions: number;
  correctQuestions: number;
  /** 0..1 */
  accuracy: number;
}

/** Accuracy broken down by question difficulty (Phase 7.3). */
export function accuracyByDifficulty(attempts: AttemptWithDifficulty[]): DifficultyAccuracy[] {
  const counts: Record<number, { attempts: number; total: number; correct: number }> = {
    1: { attempts: 0, total: 0, correct: 0 },
    2: { attempts: 0, total: 0, correct: 0 },
    3: { attempts: 0, total: 0, correct: 0 },
    4: { attempts: 0, total: 0, correct: 0 },
    5: { attempts: 0, total: 0, correct: 0 },
  };

  for (const a of attempts) {
    const diff = a.difficulty;
    if (diff && diff >= 1 && diff <= 5) {
      counts[diff].attempts += 1;
      counts[diff].total += a.total;
      counts[diff].correct += a.correct;
    }
  }

  return ([1, 2, 3, 4, 5] as const).map((d) => ({
    difficulty: d,
    attempts: counts[d].attempts,
    totalQuestions: counts[d].total,
    correctQuestions: counts[d].correct,
    accuracy: counts[d].total > 0 ? counts[d].correct / counts[d].total : 0,
  }));
}

export interface MasteryDistribution {
  total: number;
  weak: number;
  learning: number;
  mastered: number;
  unassessed: number;
  /** 0..1 */
  weakPct: number;
  learningPct: number;
  masteredPct: number;
  unassessedPct: number;
}

/** Buckets concepts into weak / learning / mastered / unassessed (Phase 7.2). */
export function conceptMasteryDistribution(
  conceptIds: string[],
  byConcept: Map<string, MasteryState>,
): MasteryDistribution {
  let weak = 0;
  let learning = 0;
  let mastered = 0;
  let unassessed = 0;

  for (const id of conceptIds) {
    const state = byConcept.get(id);
    if (!state || state.attempts === 0) {
      unassessed += 1;
    } else if (state.attempts < MIN_EVIDENCE) {
      learning += 1;
    } else if (state.mastery < 0.5) {
      weak += 1;
    } else if (state.mastery >= 0.75) {
      mastered += 1;
    } else {
      learning += 1;
    }
  }

  const total = conceptIds.length;
  return {
    total,
    weak,
    learning,
    mastered,
    unassessed,
    weakPct: total > 0 ? weak / total : 0,
    learningPct: total > 0 ? learning / total : 0,
    masteredPct: total > 0 ? mastered / total : 0,
    unassessedPct: total > 0 ? unassessed / total : 0,
  };
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  totalActiveDays: number;
}

/** Computes the learner's active daily streak and longest streak (Phase 7.5). */
export function calculateStreak(dates: string[], now: Date = new Date()): StreakInfo {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveToday: false, totalActiveDays: 0 };
  }

  const daySet = new Set<string>();
  for (const d of dates) {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      daySet.add(parsed.toISOString().slice(0, 10));
    }
  }

  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isActiveToday = daySet.has(todayStr);

  // Check current streak backwards from today or yesterday
  let currentStreak = 0;
  const startDay = isActiveToday ? todayStr : yesterdayStr;
  const checkDate = new Date(startDay);

  if (daySet.has(checkDate.toISOString().slice(0, 10))) {
    while (daySet.has(checkDate.toISOString().slice(0, 10))) {
      currentStreak += 1;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }
  }

  // Calculate longest streak chronologically
  const chronDays = [...daySet].sort();
  let tempStreak = 0;
  let longestStreak = 0;
  let prevDate: Date | null = null;

  for (const dayStr of chronDays) {
    const cur = new Date(dayStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = cur;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    isActiveToday,
    totalActiveDays: daySet.size,
  };
}

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/** Generates daily activity cells for a weekly activity heatmap (Phase 7.5). */
export function activityHeatmap(
  dates: string[],
  daysCount = 28,
  now: Date = new Date(),
): ActivityDay[] {
  const countByDay = new Map<string, number>();
  for (const d of dates) {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      const key = parsed.toISOString().slice(0, 10);
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }
  }

  const result: ActivityDay[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = countByDay.get(key) ?? 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 4) level = 4;
    else if (count === 3) level = 3;
    else if (count === 2) level = 2;
    else if (count === 1) level = 1;

    result.push({ date: key, count, level });
  }
  return result;
}

export interface FlashcardRetentionLike {
  id: string;
  reps: number;
  ease: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt?: string | null;
}

export interface RetentionSummary {
  dueNowCount: number;
  dueNext7Days: number[];
  reviewedCount: number;
  /** 0..1 (retained cards / reviewed cards) */
  retentionRate: number;
}

/** Computes retention rate and due forecast from flashcards (Phase 7.4). */
export function retentionStats(
  cards: FlashcardRetentionLike[],
  now: Date = new Date(),
): RetentionSummary {
  let dueNowCount = 0;
  let reviewedCount = 0;
  let retainedCount = 0;
  const dueNext7Days = [0, 0, 0, 0, 0, 0, 0];

  const nowTime = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const c of cards) {
    const dueTime = new Date(c.dueAt).getTime();
    if (dueTime <= nowTime) {
      dueNowCount += 1;
    }

    if (c.reps > 0) {
      reviewedCount += 1;
      if (c.intervalDays >= 2 || c.reps >= 2) {
        retainedCount += 1;
      }
    }

    const daysUntilDue = Math.floor((dueTime - nowTime) / oneDayMs);
    if (daysUntilDue >= 0 && daysUntilDue < 7) {
      dueNext7Days[daysUntilDue] += 1;
    }
  }

  return {
    dueNowCount,
    dueNext7Days,
    reviewedCount,
    retentionRate: reviewedCount > 0 ? retainedCount / reviewedCount : 0,
  };
}
