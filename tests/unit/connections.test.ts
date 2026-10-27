import { describe, expect, it } from "vitest";
import { pickAnalogyAnchor, type AnchorSubject } from "@/lib/learning/connections";

const subjects: AnchorSubject[] = [
  { slug: "music", mastery: 0.85, attempts: 15 }, // strongest, known
  { slug: "science", mastery: 0.2, attempts: 10 }, // weak (the target)
  { slug: "history", mastery: 0.6, attempts: 8 }, // decent
  { slug: "math", mastery: 0.9, attempts: 1 }, // high but too little data
];

describe("pickAnalogyAnchor", () => {
  it("picks the strongest well-practised OTHER subject", () => {
    expect(pickAnalogyAnchor("science", subjects)).toBe("music");
  });

  it("never returns the target subject itself", () => {
    expect(pickAnalogyAnchor("music", subjects)).toBe("history"); // next strongest known
  });

  it("ignores subjects that are not yet 'known' (low mastery or too few attempts)", () => {
    const weakOnly: AnchorSubject[] = [
      { slug: "a", mastery: 0.3, attempts: 10 },
      { slug: "b", mastery: 0.9, attempts: 1 },
    ];
    expect(pickAnalogyAnchor("target", weakOnly)).toBeNull();
  });

  it("returns null when there is no other subject", () => {
    expect(
      pickAnalogyAnchor("science", [{ slug: "science", mastery: 0.2, attempts: 10 }]),
    ).toBeNull();
  });
});
