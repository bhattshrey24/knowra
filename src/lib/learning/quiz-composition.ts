/**
 * Deterministic quiz composition: how a requested count is split across the
 * selected question formats, and the order a mixed quiz is presented in.
 *
 * Like the rest of `src/lib/learning`, this is LLM-independent and unit-tested.
 * Providers only generate content for a single format at a time; this module
 * decides how many of each to request and how to interleave the results so a
 * "mcq + written" quiz actually alternates rather than clustering by type.
 */

import type { QuestionFormat } from "@/types/learning";

function dedupe(formats: QuestionFormat[]): QuestionFormat[] {
  const seen = new Set<QuestionFormat>();
  const out: QuestionFormat[] = [];
  for (const f of formats) {
    if (!seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

/**
 * Round-robin sequence of the selected formats, of length `total`. This is both
 * the presentation order and the basis for how many of each format to request.
 */
export function planFormatSequence(total: number, formats: QuestionFormat[]): QuestionFormat[] {
  const unique = dedupe(formats);
  if (total <= 0 || unique.length === 0) return [];
  return Array.from({ length: total }, (_, i) => unique[i % unique.length]);
}

/** How many questions of each format to request from the provider. */
export function allocateFormatCounts(
  total: number,
  formats: QuestionFormat[],
): Partial<Record<QuestionFormat, number>> {
  const counts: Partial<Record<QuestionFormat, number>> = {};
  for (const format of planFormatSequence(total, formats)) {
    counts[format] = (counts[format] ?? 0) + 1;
  }
  return counts;
}

/**
 * Reorder generated questions to follow the planned round-robin sequence,
 * drawing from a per-format bucket each step. Any questions a provider returns
 * beyond the plan (over-generation) are appended rather than dropped.
 */
export function interleaveByFormat<T extends { format: QuestionFormat }>(
  questions: T[],
  total: number,
  formats: QuestionFormat[],
): T[] {
  const buckets = new Map<QuestionFormat, T[]>();
  for (const question of questions) {
    const bucket = buckets.get(question.format) ?? [];
    bucket.push(question);
    buckets.set(question.format, bucket);
  }

  const ordered: T[] = [];
  for (const format of planFormatSequence(total, formats)) {
    const next = buckets.get(format)?.shift();
    if (next) ordered.push(next);
  }
  // Preserve anything left over (provider returned more than planned).
  for (const bucket of buckets.values()) ordered.push(...bucket);
  return ordered;
}
