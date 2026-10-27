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

/** A topic within a domain, e.g. "Trigonometry" within Mathematics. */
export interface Topic {
  id: string;
  domainId: string;
  name: string;
}

/**
 * The atomic unit of knowledge. Quiz questions map to concepts; mastery,
 * weakness detection and spaced repetition all operate at the concept level.
 */
export interface Concept {
  id: string;
  topicId: string;
  name: string;
  /**
   * 0..1 weight for 80/20 prioritization (#7): higher means more foundational
   * / higher-value, so the scheduler surfaces it earlier.
   */
  foundationalWeight: number;
  /** Concept ids that should be understood before this one (#12). */
  prerequisiteIds: string[];
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

/** Distinguishes revision cards targeting weaknesses from foundational ones (#4). */
export type FlashcardType = "weakness" | "foundational";

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
