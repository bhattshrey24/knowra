/**
 * Provider-agnostic LLM abstraction.
 *
 * The product keeps its knowledge profile and learning engine independent of
 * the LLM provider. Any provider (the free default, or a user-supplied
 * Anthropic / OpenAI key later) implements this interface. Callers depend only
 * on `LLMProvider`, never on a concrete SDK.
 *
 * Implementations are added in Phase 1 (default: Google Gemini Flash free tier).
 * Each method receives only the minimal context required for its task.
 */

import type {
  Concept,
  Difficulty,
  Flashcard,
  Question,
  QuestionFormat,
  StudyFocusItem,
  StudyPlan,
} from "@/types/learning";

/**
 * Content a provider returns, before the system assigns identifiers. `id` and
 * `conceptId` are owned by our database layer, not the model.
 */
export type GeneratedQuestion = Omit<Question, "id" | "conceptId"> & {
  /**
   * The concept name the model says this question tests (Phase 6.1). Untrusted
   * and transient: the app resolves it to a validated taxonomy concept id and
   * drops it before storing. Present only when `concepts` was supplied.
   */
  conceptLabel?: string;
};
export type GeneratedFlashcard = Omit<Flashcard, "id" | "conceptId">;

export interface GenerateQuestionsInput {
  conceptName: string;
  topicName: string;
  domainName: string;
  difficulty: Difficulty;
  formats: QuestionFormat[];
  count: number;
  /**
   * The taxonomy concepts this quiz is scoped to (Phase 6.1). When provided,
   * the model spreads questions across them and labels each with the concept
   * it tests; the app validates the label against this set.
   */
  concepts?: { id: string; name: string }[];
  /** Concepts the user already knows, for cross-domain analogies (#10). */
  knownConcepts?: string[];
  /** Avoid regenerating near-duplicates of these prompts. */
  avoidPrompts?: string[];
}

export interface GenerateFlashcardsInput {
  concept: Pick<Concept, "name">;
  type: Flashcard["type"];
  /** Optional familiar concept to anchor a cross-domain analogy. */
  analogyAnchor?: string;
}

export interface ExplainInput {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
}

export interface GradeWrittenInput {
  question: Question;
  userAnswer: string;
}

export interface GradeWrittenResult {
  /** 0..1 score from the model; the deterministic engine owns mastery updates. */
  score: number;
  feedback: string;
}

export interface ClassifyInput {
  /** What the learner typed, e.g. "Python decorators". */
  query: string;
  /** Existing subject names, so the model can reuse one rather than invent. */
  subjects: string[];
}

/** An LLM-proposed Subject → Topic → Concept classification (names only). */
export interface ClassifiedConcept {
  subject: string;
  topic: string;
  concept: string;
}

export interface GenerateStudyPlanInput {
  subjectName: string;
  /**
   * The concepts the deterministic engine selected to focus on, with the reason
   * (weak / unassessed / due / strong). The model plans around *these* — it must
   * not introduce other concepts, and the caller validates that it didn't.
   */
  focus: StudyFocusItem[];
}

/**
 * The contract every LLM backend implements. Returned content is always
 * schema-validated by the caller (zod) before it is stored or rendered —
 * model output is treated as untrusted input.
 */
export interface LLMProvider {
  readonly id: string;
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
  generateFlashcards(input: GenerateFlashcardsInput): Promise<GeneratedFlashcard[]>;
  explain(input: ExplainInput): Promise<string>;
  gradeWritten(input: GradeWrittenInput): Promise<GradeWrittenResult>;
  /** Propose where a free-text learning request fits in the taxonomy (#6.3). */
  classify(input: ClassifyInput): Promise<ClassifiedConcept>;
  /**
   * Turn the engine's selected focus concepts into a readable study plan. The
   * model only narrates and orders; it must reference only the given concepts,
   * and the caller validates + guardrails the result.
   */
  generateStudyPlan(input: GenerateStudyPlanInput): Promise<StudyPlan>;
}
