import { describe, expect, it } from "vitest";
import { buildFlashcardsFromQuiz, type QuizAnswerInput } from "@/lib/learning/flashcards";

const q = (over: Partial<QuizAnswerInput>): QuizAnswerInput => ({
  prompt: "What is 2 + 2?",
  options: ["3", "4", "5", "22"],
  selected: [1],
  correctIndices: [1],
  explanation: "2 + 2 = 4.",
  ...over,
});

describe("buildFlashcardsFromQuiz", () => {
  it("creates a weakness card for each wrong answer", () => {
    const cards = buildFlashcardsFromQuiz([q({ selected: [0] }), q({ selected: [2] })]);
    const weakness = cards.filter((c) => c.type === "weakness");
    expect(weakness).toHaveLength(2);
    expect(weakness[0].front).toContain("2 + 2");
    expect(weakness[0].back).toContain("4"); // the correct option text
    expect(weakness[0].back).toContain("2 + 2 = 4."); // explanation included
  });

  it("creates foundational cards from correct answers, capped", () => {
    const answers = Array.from({ length: 5 }, () => q({ selected: [1] })); // all correct
    const cards = buildFlashcardsFromQuiz(answers, { maxFoundational: 3 });
    expect(cards.every((c) => c.type === "foundational")).toBe(true);
    expect(cards).toHaveLength(3);
  });

  it("mixes weakness (all wrong) and foundational (some right)", () => {
    const cards = buildFlashcardsFromQuiz([
      q({ selected: [0] }), // wrong
      q({ selected: [1] }), // right
    ]);
    expect(cards.filter((c) => c.type === "weakness")).toHaveLength(1);
    expect(cards.filter((c) => c.type === "foundational")).toHaveLength(1);
  });

  it("joins multiple correct options in the answer text", () => {
    const [card] = buildFlashcardsFromQuiz([
      q({ options: ["a", "b", "c"], correctIndices: [0, 2], selected: [0] }), // wrong (partial)
    ]);
    expect(card.type).toBe("weakness");
    expect(card.back).toContain("a");
    expect(card.back).toContain("c");
  });
});
