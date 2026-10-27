import { describe, expect, it } from "vitest";
import { customSlug, normalizeTopicTitle, predefinedLearnable } from "@/lib/learnable";

describe("customSlug", () => {
  it("kebab-cases and prefixes custom topics", () => {
    expect(customSlug("Photosynthesis")).toBe("t-photosynthesis");
    expect(customSlug("French Revolution")).toBe("t-french-revolution");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(customSlug("  Quantum   Entanglement!! ")).toBe("t-quantum-entanglement");
  });

  it("never collides with a predefined domain slug", () => {
    // predefined 'science' must stay distinct from a custom 'science' topic
    expect(customSlug("science")).toBe("t-science");
    expect(predefinedLearnable("t-science")).toBeNull();
  });
});

describe("normalizeTopicTitle", () => {
  it("trims and collapses whitespace but preserves casing", () => {
    expect(normalizeTopicTitle("  French   Revolution ")).toBe("French Revolution");
  });
});

describe("predefinedLearnable", () => {
  it("resolves a known domain and rejects unknown/custom slugs", () => {
    expect(predefinedLearnable("science")?.name).toBe("Science");
    expect(predefinedLearnable("science")?.isCustom).toBe(false);
    expect(predefinedLearnable("nope")).toBeNull();
  });
});
