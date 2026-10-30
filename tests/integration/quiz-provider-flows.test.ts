// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Control the per-user concept mastery lookup so we can exercise the two flows:
// an authenticated user *with* quiz history vs. a new/anonymous user with none.
// This is the only point in the quiz route that reads per-user state.
const { fetchConceptMastery } = vi.hoisted(() => ({ fetchConceptMastery: vi.fn() }));
vi.mock("@/lib/db/concept-mastery-server", () => ({ fetchConceptMastery }));

import { POST } from "@/app/api/quiz/route";
import { __resetRateLimit } from "@/lib/rate-limit";
import type { ConceptMasteryInfo } from "@/lib/db/concept-mastery-server";
import { buildTaxonomy, conceptsForScope } from "@/lib/learning/taxonomy";
import { SEED_TAXONOMY } from "@/lib/taxonomy/seed";

const mathConcepts = conceptsForScope(buildTaxonomy(SEED_TAXONOMY), "subject", "mathematics");

/** A Gemini REST response whose JSON body is `n` schema-valid MCQs. */
function geminiMcqResponse(n: number): Response {
  const mcqs = Array.from({ length: n }, (_, i) => ({
    prompt: `Question ${i + 1}?`,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Because A.",
    concept: "Arithmetic",
  }));
  const body = { candidates: [{ content: { parts: [{ text: JSON.stringify(mcqs) }] } }] };
  return new Response(JSON.stringify(body), { status: 200 });
}

/** Simulate "signed-in user with history": real mastery for some concepts. */
function authenticatedMastery(): Map<string, ConceptMasteryInfo> {
  const map = new Map<string, ConceptMasteryInfo>();
  for (const id of mathConcepts.slice(0, 3)) {
    map.set(id, {
      state: { mastery: 0.4, confidence: 0.6, attempts: 8, correct: 3 },
      lastSeenDaysAgo: 2,
    });
  }
  return map;
}

function post(body: unknown, ip: string) {
  return POST(
    new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  __resetRateLimit();
  fetchConceptMastery.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("quiz provider selection is identical for authenticated and unauthenticated flows", () => {
  function configureGeminiAndStubFetch() {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    // Any Gemini call returns valid MCQs, so the route must NOT fall back.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => geminiMcqResponse(6)),
    );
  }

  it("uses the configured gemini provider for an AUTHENTICATED user (with history)", async () => {
    configureGeminiAndStubFetch();
    fetchConceptMastery.mockResolvedValue(authenticatedMastery());

    const res = await post({ domain: "mathematics", difficulty: 3, count: 4 }, "auth-ip");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("gemini");
    expect(data.fallback).toBe(false);
    expect(data.questions).toHaveLength(4);
  });

  it("uses the configured gemini provider for a NEW/anonymous user (no history, diagnostic)", async () => {
    configureGeminiAndStubFetch();
    fetchConceptMastery.mockResolvedValue(new Map());

    const res = await post(
      { domain: "mathematics", difficulty: 3, count: 4, diagnostic: true },
      "anon-ip",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("gemini");
    expect(data.fallback).toBe(false);
    expect(data.questions).toHaveLength(4);
  });

  it("resolves the SAME provider regardless of the auth/history condition", async () => {
    configureGeminiAndStubFetch();

    fetchConceptMastery.mockResolvedValue(authenticatedMastery());
    const authed = await (await post({ domain: "science", difficulty: 2, count: 3 }, "a")).json();

    fetchConceptMastery.mockResolvedValue(new Map());
    const anon = await (await post({ domain: "science", difficulty: 2, count: 3 }, "b")).json();

    expect(authed.provider).toBe("gemini");
    expect(anon.provider).toBe("gemini");
    expect(authed.provider).toBe(anon.provider);
  });
});

describe("mock and fallback behaviour is preserved", () => {
  it("uses the mock provider when none is configured (both flows)", async () => {
    // LLM_PROVIDER unset → free mock default, independent of history.
    vi.stubEnv("LLM_PROVIDER", "");
    fetchConceptMastery.mockResolvedValue(authenticatedMastery());

    const res = await post({ domain: "mathematics", difficulty: 3, count: 4 }, "mock-ip");
    const data = await res.json();

    expect(data.provider).toBe("mock");
    expect(data.fallback).toBe(false);
    expect(data.questions).toHaveLength(4);
  });

  it("falls back to mock when the configured provider throws (does not dead-end)", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    // Gemini is selected but every call fails (e.g. 429 / network) — the exact
    // production symptom that looks like a "switch to mock".
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    fetchConceptMastery.mockResolvedValue(authenticatedMastery());

    const res = await post({ domain: "mathematics", difficulty: 3, count: 4 }, "fallback-ip");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("mock-fallback");
    expect(data.fallback).toBe(true);
    expect(data.questions).toHaveLength(4);
  });
});
