/**
 * Deterministic in-memory LLM provider. Used in tests and as the default when
 * no real provider key is configured, so the whole app runs and is verifiable
 * end-to-end for free. Output is intentionally shaped to pass the same
 * validation (`parseLlmMcqs`) as a real provider's output.
 */

import type {
  ClassifiedConcept,
  ClassifyInput,
  ExplainInput,
  GeneratedFlashcard,
  GeneratedQuestion,
  GenerateFlashcardsInput,
  GenerateQuestionsInput,
  GradeWrittenInput,
  GradeWrittenResult,
  LLMProvider,
} from "@/lib/llm/provider";

export class MockLLMProvider implements LLMProvider {
  readonly id = "mock";

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const count = Math.max(1, Math.min(input.count, 30));
    const format = input.formats[0] ?? "mcq";
    const concepts = input.concepts ?? [];
    return Array.from({ length: count }, (_, i) => {
      const options = Array.from({ length: 4 }, (_, j) => `${input.conceptName} — choice ${j + 1}`);
      const prompt = `[${input.domainName}] Practice question ${i + 1} on "${input.conceptName}" (level ${input.difficulty}).`;
      // Mirror a real provider: when scoped to concepts, label each question
      // (round-robin) so the app's concept tagging has something to resolve.
      const conceptLabel = concepts.length ? concepts[i % concepts.length].name : undefined;

      if (format === "written") {
        return {
          difficulty: input.difficulty,
          format: "written" as const,
          prompt: `Explain in your own words: ${input.conceptName} (question ${i + 1}).`,
          referenceAnswer: `A good answer covers the core idea of "${input.conceptName}".`,
          explanation: `This is mock reference content for "${input.conceptName}".`,
          conceptLabel,
        };
      }

      if (format === "multi") {
        const correctIndices = [0, (i % 2) + 2]; // two correct, deterministic
        return {
          difficulty: input.difficulty,
          format: "multi" as const,
          prompt,
          options,
          correctIndices,
          explanation: `Choices ${correctIndices.map((n) => n + 1).join(" and ")} are correct (mock).`,
          conceptLabel,
        };
      }

      const correctIndex = i % 4;
      return {
        difficulty: input.difficulty,
        format: "mcq" as const,
        prompt,
        options,
        correctIndices: [correctIndex],
        explanation: `The correct answer is choice ${correctIndex + 1}. This is mock content for "${input.conceptName}".`,
        conceptLabel,
      };
    });
  }

  async generateFlashcards(input: GenerateFlashcardsInput): Promise<GeneratedFlashcard[]> {
    if (input.type === "connection" && input.analogyAnchor) {
      return [
        {
          type: "connection",
          front: `How is "${input.concept.name}" like ${input.analogyAnchor}?`,
          back: `Just as you understand ${input.analogyAnchor}, "${input.concept.name}" follows a similar pattern — a mock cross-domain analogy linking the two.`,
        },
      ];
    }
    return [
      {
        type: input.type,
        front: `What is a key idea of "${input.concept.name}"?`,
        back: `A concise mock explanation of "${input.concept.name}".`,
      },
    ];
  }

  async explain(input: ExplainInput): Promise<string> {
    return input.isCorrect
      ? `Correct. ${input.question.explanation ?? "Well reasoned."}`
      : `Not quite. ${input.question.explanation ?? "Review the key idea and try again."}`;
  }

  async classify(input: ClassifyInput): Promise<ClassifiedConcept> {
    // Deterministic: reuse the first existing subject, treat the query as a new
    // topic/concept. Real providers classify properly.
    return {
      subject: input.subjects[0] ?? "General Knowledge",
      topic: input.query,
      concept: input.query,
    };
  }

  async gradeWritten(input: GradeWrittenInput): Promise<GradeWrittenResult> {
    const answered = input.userAnswer.trim().length > 0;
    return {
      score: answered ? 0.5 : 0,
      feedback: answered
        ? "Mock grading: partial credit. Connect your answer to the core concept."
        : "No answer provided.",
    };
  }
}
