import { describe, expect, it } from "vitest";
import { MAX_FOCUS, buildLearnerContext, fallbackReply } from "@/lib/learning/tutor-context";
import { DEFAULT_LEARNING_STYLE } from "@/lib/learning/learning-style";
import type { LearnerContext, StudyFocusItem } from "@/types/learning";

const focus = (
  name: string,
  status: StudyFocusItem["status"],
  over: Partial<StudyFocusItem> = {},
): StudyFocusItem => ({
  conceptId: name.toLowerCase().replace(/\s+/g, "-"),
  conceptName: name,
  status,
  ...over,
});

const context = (over: Partial<LearnerContext> = {}): LearnerContext =>
  buildLearnerContext({ style: DEFAULT_LEARNING_STYLE, focus: [], ...over });

describe("buildLearnerContext", () => {
  it("caps focus to MAX_FOCUS items", () => {
    const many = Array.from({ length: MAX_FOCUS + 3 }, (_, i) => focus(`Concept ${i}`, "weak"));
    expect(buildLearnerContext({ style: DEFAULT_LEARNING_STYLE, focus: many }).focus).toHaveLength(
      MAX_FOCUS,
    );
  });

  it("dedupes and trims subjects, drops blanks", () => {
    const ctx = buildLearnerContext({
      style: DEFAULT_LEARNING_STYLE,
      focus: [],
      subjects: ["Math", " Math ", "", "Science"],
    });
    expect(ctx.subjects).toEqual(["Math", "Science"]);
  });

  it("normalises a blank display name to undefined", () => {
    expect(context({ displayName: "   " }).displayName).toBeUndefined();
    expect(context({ displayName: " Ada " }).displayName).toBe("Ada");
  });
});

describe("fallbackReply", () => {
  it("asks the learner to take a quiz when there is no focus", () => {
    const reply = fallbackReply("what should I study?", context());
    expect(reply.toLowerCase()).toContain("quiz");
  });

  it("names weak concepts when asked about weaknesses", () => {
    const ctx = context({ focus: [focus("Fractions", "weak"), focus("Limits", "due")] });
    const reply = fallbackReply("what am I weak at?", ctx);
    expect(reply).toContain("Fractions");
    expect(reply).not.toContain("Limits");
  });

  it("summarises due, weak, and new work when asked what to study", () => {
    const ctx = context({
      focus: [
        focus("Derivatives", "due", { dueCount: 2 }),
        focus("Vectors", "weak"),
        focus("Series", "unassessed"),
      ],
    });
    const reply = fallbackReply("what should I study next?", ctx);
    expect(reply).toContain("Derivatives");
    expect(reply).toContain("Vectors");
    expect(reply).toContain("Series");
  });

  it("prefixes the learner's name and capitalises the sentence", () => {
    const ctx = context({ displayName: "Ada", focus: [focus("Fractions", "weak")] });
    const reply = fallbackReply("what am I weak at?", ctx);
    expect(reply.startsWith("Ada, ")).toBe(true);
  });

  it("capitalises the opening word when there is no name", () => {
    const ctx = context({ focus: [focus("Fractions", "weak")] });
    const reply = fallbackReply("what am I weak at?", ctx);
    expect(reply[0]).toBe(reply[0].toUpperCase());
    expect(/^[a-z]/.test(reply)).toBe(false);
  });

  it("gives a grounded generic reply for an unclassified question", () => {
    const ctx = context({ focus: [focus("Fractions", "weak"), focus("Limits", "unassessed")] });
    const reply = fallbackReply("tell me something", ctx);
    expect(reply).toContain("Fractions");
  });
});
