/**
 * Study-plan engine (AI advisor support). Deterministic and LLM-independent:
 * it decides *which* concepts a learner should focus on and why, from their
 * recorded mastery and due flashcards. An LLM later turns this into a readable
 * plan — but the facts here are the source of truth, and the deterministic
 * `fallbackStudyPlan` guarantees a useful plan even with no LLM.
 */

import type { MasteryState } from "@/lib/learning/mastery";
import { selectConceptsForQuiz, type ConceptCandidate } from "@/lib/learning/concept-selection";
import type { StudyAction, StudyFocusItem, StudyFocusStatus, StudyPlan } from "@/types/learning";

/** A concept plus the learner's state, as the engine sees it. */
export interface StudyCandidate {
  conceptId: string;
  conceptName: string;
  state?: MasteryState;
  lastSeenDaysAgo?: number;
  /** Flashcards currently due for this concept. */
  dueCount?: number;
}

/** Default number of concepts a plan focuses on — enough to guide, not overwhelm. */
export const DEFAULT_FOCUS_SIZE = 5;

const STATUS_FOR_REASON: Record<string, StudyFocusStatus> = {
  weak: "weak",
  unassessed: "unassessed",
  retention: "due",
  practice: "strong",
};

const ACTION_FOR_STATUS: Record<StudyFocusStatus, StudyAction> = {
  weak: "strengthen",
  unassessed: "learn",
  due: "review",
  strong: "review",
};

/** The study action implied by a focus item's status. */
export function actionForStatus(status: StudyFocusStatus): StudyAction {
  return ACTION_FOR_STATUS[status];
}

/**
 * Rank the concepts a learner should focus on next. Concepts with flashcards
 * due for review come first (spaced repetition is time-sensitive), then the
 * balanced weak → unassessed → retention selection the quiz engine uses.
 * Deterministic: same inputs → same ordered output.
 */
export function buildStudyFocus(
  candidates: StudyCandidate[],
  max = DEFAULT_FOCUS_SIZE,
): StudyFocusItem[] {
  if (max <= 0) return [];
  const nameById = new Map(candidates.map((c) => [c.conceptId, c.conceptName]));

  // 1. Due-for-review concepts first, most overdue (highest dueCount) first.
  const due = candidates
    .filter((c) => (c.dueCount ?? 0) > 0)
    .sort((a, b) => (b.dueCount ?? 0) - (a.dueCount ?? 0));
  const dueIds = new Set(due.map((c) => c.conceptId));

  const focus: StudyFocusItem[] = due.slice(0, max).map((c) => ({
    conceptId: c.conceptId,
    conceptName: c.conceptName,
    status: "due",
    mastery: c.state?.mastery,
    dueCount: c.dueCount,
  }));

  // 2. Fill the rest with the balanced selection, excluding already-included
  //    due concepts. Reuse the quiz selector so ranking stays consistent.
  if (focus.length < max) {
    const rest: ConceptCandidate[] = candidates
      .filter((c) => !dueIds.has(c.conceptId))
      .map((c) => ({ id: c.conceptId, state: c.state, lastSeenDaysAgo: c.lastSeenDaysAgo }));
    for (const sel of selectConceptsForQuiz(rest, max - focus.length)) {
      focus.push({
        conceptId: sel.id,
        conceptName: nameById.get(sel.id) ?? sel.id,
        status: STATUS_FOR_REASON[sel.reason] ?? "unassessed",
        mastery: rest.find((r) => r.id === sel.id)?.state?.mastery,
      });
    }
  }

  return focus.slice(0, max);
}

const VERB: Record<StudyFocusStatus, string> = {
  weak: "Strengthen",
  unassessed: "Learn",
  due: "Review",
  strong: "Keep sharp",
};

function reasonFor(item: StudyFocusItem): string {
  switch (item.status) {
    case "due":
      return item.dueCount && item.dueCount > 1
        ? `${item.dueCount} flashcards are due for review.`
        : "A flashcard is due for review — recall it before it fades.";
    case "weak":
      return "Your recent answers here were shaky — a focused round will shore it up.";
    case "unassessed":
      return "You haven't been quizzed on this yet — a short quiz will map your level.";
    default:
      return "A quick refresher keeps this one solid.";
  }
}

/**
 * Build a useful study plan with no LLM — templated from the engine's focus.
 * Also the guaranteed fallback when LLM generation is unavailable or rejected.
 */
export function fallbackStudyPlan(subjectName: string, focus: StudyFocusItem[]): StudyPlan {
  if (focus.length === 0) {
    return {
      overview: `You're all caught up in ${subjectName}. Start a quiz to find your next edge.`,
      steps: [],
      encouragement: "Every quiz sharpens the picture of what you know.",
    };
  }

  const counts = focus.reduce<Record<StudyFocusStatus, number>>(
    (acc, f) => ({ ...acc, [f.status]: (acc[f.status] ?? 0) + 1 }),
    { weak: 0, unassessed: 0, due: 0, strong: 0 },
  );
  const parts: string[] = [];
  if (counts.due) parts.push(`${counts.due} due for review`);
  if (counts.weak) parts.push(`${counts.weak} to strengthen`);
  if (counts.unassessed) parts.push(`${counts.unassessed} new to explore`);
  const summary = parts.length ? parts.join(", ") : `${focus.length} concepts`;

  return {
    overview: `Your next steps in ${subjectName}: ${summary}.`,
    steps: focus.map((item) => ({
      conceptId: item.conceptId,
      conceptName: item.conceptName,
      action: actionForStatus(item.status),
      reason: `${VERB[item.status]} ${item.conceptName}. ${reasonFor(item)}`,
    })),
    encouragement: "Short, focused sessions beat cramming — one step at a time.",
  };
}
