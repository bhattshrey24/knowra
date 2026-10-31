import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEARNING_STYLE,
  STYLE_SATURATION,
  deriveLearningStyle,
  type AttemptSignal,
} from "@/lib/learning/learning-style";

const sig = (over: Partial<AttemptSignal> = {}): AttemptSignal => ({
  format: "mcq",
  difficulty: 2,
  ...over,
});

describe("deriveLearningStyle", () => {
  it("returns the default style when there is no history", () => {
    expect(deriveLearningStyle([])).toEqual(DEFAULT_LEARNING_STYLE);
  });

  it("still reflects analogy engagement with no attempt history", () => {
    const style = deriveLearningStyle([], { analogyFlashcards: 3 });
    expect(style.likesAnalogies).toBe(true);
    expect(style.preferredFormat).toBe("mcq");
    expect(style.confidence).toBe(0);
  });

  it("picks the most-used format as preferred", () => {
    const style = deriveLearningStyle([
      sig({ format: "mcq" }),
      sig({ format: "mcq" }),
      sig({ format: "written", answerWords: 5 }),
    ]);
    expect(style.preferredFormat).toBe("mcq");
  });

  it("resolves a format tie toward the richer format (written > multi > mcq)", () => {
    const style = deriveLearningStyle([
      sig({ format: "mcq" }),
      sig({ format: "written", answerWords: 4 }),
    ]);
    expect(style.preferredFormat).toBe("written");
  });

  it("marks written-leaning learners as detailed", () => {
    const style = deriveLearningStyle([
      sig({ format: "written", answerWords: 3 }),
      sig({ format: "written", answerWords: 6 }),
    ]);
    expect(style.verbosity).toBe("detailed");
  });

  it("marks long average written answers as detailed even when mcq-leaning", () => {
    const style = deriveLearningStyle([
      sig({ format: "mcq" }),
      sig({ format: "mcq" }),
      sig({ format: "written", answerWords: 80 }),
    ]);
    expect(style.preferredFormat).toBe("mcq");
    expect(style.verbosity).toBe("detailed");
  });

  it("keeps short-answer, mcq-leaning learners concise", () => {
    const style = deriveLearningStyle([sig({ format: "mcq" }), sig({ format: "multi" })]);
    expect(style.verbosity).toBe("concise");
  });

  it("averages difficulty into a 1..5 level", () => {
    const style = deriveLearningStyle([
      sig({ difficulty: 4 }),
      sig({ difficulty: 5 }),
      sig({ difficulty: 4 }),
    ]);
    expect(style.level).toBe(4);
  });

  it("grows confidence with history, saturating at 1", () => {
    const few = deriveLearningStyle(Array.from({ length: 3 }, () => sig()));
    expect(few.confidence).toBeCloseTo(3 / STYLE_SATURATION);

    const many = deriveLearningStyle(Array.from({ length: STYLE_SATURATION + 5 }, () => sig()));
    expect(many.confidence).toBe(1);
  });

  it("is deterministic: same input → same output", () => {
    const signals = [
      sig({ format: "multi", difficulty: 3 }),
      sig({ format: "written", answerWords: 10 }),
    ];
    expect(deriveLearningStyle(signals)).toEqual(deriveLearningStyle(signals));
  });
});
