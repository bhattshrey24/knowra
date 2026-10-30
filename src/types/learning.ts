/**
 * Core domain types for Knowra's learning model.
 *
 * These are the vocabulary shared by the deterministic learning engine
 * (`src/lib/learning`), the database layer (`src/lib/db`), and the LLM
 * abstraction (`src/lib/llm`). The learning engine and knowledge profile are
 * intentionally independent of any LLM provider — see docs/ai-log.md.
 */

/** Quiz difficulty, user-selectable 1..5 (the engine may *recommend* a value). */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Supported question formats (multiple-choice ships first; see FEATURES.md #11). */
export type QuestionFormat = "mcq" | "multi" | "written";

/** A broad learning area, e.g. Mathematics, Science, Music. */
export interface Domain {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Lucide icon name used by the UI. */
  icon: string;
}

/**
 * A level in the shared Subject → Topic → Concept taxonomy (Phase 6.1). A quiz
 * can be scoped to any level; results are always tracked at the concept level
 * and aggregated upward.
 */
export type TaxonomyLevel = "subject" | "topic" | "concept";

/**
 * The top of the taxonomy, e.g. Mathematics. `id` is a stable slug; for the
 * seed it matches the corresponding predefined `Domain.slug` so the existing
 * flat flow and the new taxonomy line up.
 */
export interface Subject {
  id: string;
  name: string;
  description?: string;
}

/** A topic within a subject, e.g. "Algebra" within Mathematics. */
export interface Topic {
  id: string;
  subjectId: string;
  name: string;
}

/**
 * The atomic unit of knowledge. Quiz questions map to concepts; mastery,
 * weakness detection and spaced repetition all operate at the concept level.
 * A concept may belong to more than one topic (and so span subjects) — shared,
 * never duplicated (Phase 6.1).
 */
export interface Concept {
  id: string;
  name: string;
  /** Topics this concept belongs to — one or more. */
  topicIds: string[];
  /**
   * 0..1 weight for 80/20 prioritization (#7): higher means more foundational
   * / higher-value, so the scheduler surfaces it earlier.
   */
  foundationalWeight?: number;
  /** Concept ids that should be understood before this one (#12). */
  prerequisiteIds?: string[];
}

/** A single quiz question. LLM-generated, cached, and reused across users. */
export interface Question {
  id: string;
  conceptId: string;
  difficulty: Difficulty;
  format: QuestionFormat;
  prompt: string;
  /** Present for mcq/multi; omitted for written. */
  options?: string[];
  /** Indices into `options` that are correct (single element for mcq). */
  correctIndices?: number[];
  /** Reference answer / rubric used for written grading and explanations. */
  referenceAnswer?: string;
  explanation?: string;
}

/**
 * Revision-card kinds: weakness-targeting, foundational, or a cross-domain
 * connection/analogy linking a concept to one the learner already knows (#10).
 */
export type FlashcardType = "weakness" | "foundational" | "connection";

export interface Flashcard {
  id: string;
  conceptId: string;
  type: FlashcardType;
  front: string;
  back: string;
}

/** Per-user, per-concept mastery estimate maintained by the deterministic engine. */
export interface ConceptMastery {
  conceptId: string;
  /** 0..1 estimated mastery. */
  mastery: number;
  /** 0..1 confidence in the estimate, grows with attempts and recency. */
  confidence: number;
  attempts: number;
  lastSeenAt: string | null;
  /** SM-2 spaced-repetition scheduling fields. */
  nextDueAt: string | null;
  intervalDays: number;
  ease: number;
}

/**
 * Study-plan types (AI advisor). The deterministic engine computes the *facts*
 * (which concepts to focus on and why); the LLM only turns those facts into a
 * readable plan. The LLM never decides what a learner is weak at.
 */
export type StudyFocusStatus = "weak" | "unassessed" | "due" | "strong";

/** One concept the engine has flagged for attention, with the reason. */
export interface StudyFocusItem {
  conceptId: string;
  conceptName: string;
  status: StudyFocusStatus;
  /** 0..1 mastery when known. */
  mastery?: number;
  /** Flashcards currently due for this concept, when known. */
  dueCount?: number;
}

export type StudyAction = "learn" | "review" | "strengthen";

/** One actionable step in a study plan, always tied to a real concept. */
export interface StudyStep {
  conceptId: string;
  conceptName: string;
  action: StudyAction;
  /** Short rationale (LLM-written, or templated in the deterministic fallback). */
  reason: string;
}

export interface StudyPlan {
  overview: string;
  steps: StudyStep[];
  encouragement?: string;
}
