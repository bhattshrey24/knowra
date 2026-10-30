/**
 * Tutor context + deterministic fallback. The engine assembles a compact,
 * authoritative snapshot of the learner for the AI tutor to reference, and
 * provides a useful fallback reply so the assistant still answers when no LLM
 * is configured or a call fails. The LLM only phrases; these facts are truth.
 */

import type { LearnerContext, LearningStyle, StudyFocusItem } from "@/types/learning";

/** Keep the tutor context small — enough to ground an answer, not overwhelm. */
export const MAX_FOCUS = 5;
/** Cap the number of subjects named, so the prompt stays compact. */
export const MAX_SUBJECTS = 8;

/** Assemble the bounded learner snapshot the tutor LLM is allowed to reference. */
export function buildLearnerContext(params: {
  displayName?: string;
  style: LearningStyle;
  focus: StudyFocusItem[];
  subjects?: string[];
  assessedConcepts?: number;
}): LearnerContext {
  return {
    displayName: params.displayName?.trim() || undefined,
    style: params.style,
    focus: params.focus.slice(0, MAX_FOCUS),
    subjects: dedupe(params.subjects ?? []).slice(0, MAX_SUBJECTS),
    assessedConcepts: Math.max(0, Math.trunc(params.assessedConcepts ?? 0)),
  };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

const byStatus = (focus: StudyFocusItem[], status: StudyFocusItem["status"]) =>
  focus.filter((f) => f.status === status);

const names = (items: StudyFocusItem[]): string => items.map((i) => i.conceptName).join(", ");

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * A useful, honest reply built only from engine facts — no LLM. Handles the
 * common intents ("what am I weak at", "what should I study next"), and
 * otherwise grounds the learner in their current focus. Used when no provider
 * is configured or an LLM call fails, so the assistant never dead-ends.
 */
export function fallbackReply(message: string, context: LearnerContext): string {
  const m = message.toLowerCase();
  const { focus } = context;
  const greeting = context.displayName ? `${context.displayName}, ` : "";

  if (focus.length === 0) {
    return capFirst(
      `${greeting}I don't have enough of your quiz history yet to tailor advice. Take a quiz and I'll map your strengths and weak spots, then tell you exactly what to review.`,
    );
  }

  let sentence: string;
  if (/\b(weak|struggl|bad at|worst|don'?t (know|understand)|hard)\b/.test(m)) {
    const weak = byStatus(focus, "weak");
    sentence = weak.length
      ? `${greeting}your shakiest concepts right now are ${names(weak)}. A short, focused quiz on these will shore them up fastest.`
      : `${greeting}nothing stands out as clearly weak yet — but ${names(focus.slice(0, 3))} are what I'd reinforce next.`;
  } else if (/\b(study|revise|review|next|what should|focus|plan|practice|learn)\b/.test(m)) {
    const parts: string[] = [];
    const due = byStatus(focus, "due");
    const weak = byStatus(focus, "weak");
    const fresh = byStatus(focus, "unassessed");
    if (due.length) parts.push(`review ${names(due)} (due for spaced repetition)`);
    if (weak.length) parts.push(`strengthen ${names(weak)}`);
    if (fresh.length) parts.push(`start learning ${names(fresh)}`);
    const body = parts.length ? parts.join("; then ") : `focus on ${names(focus.slice(0, 3))}`;
    sentence = `${greeting}here's what I'd do next: ${body}.`;
  } else {
    sentence = `${greeting}based on your profile, the concepts worth your attention next are ${names(
      focus.slice(0, 3),
    )}. Ask me what you're weak at or what to study next, and I'll point you to the right quiz.`;
  }

  return capFirst(sentence);
}
