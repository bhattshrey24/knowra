// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Keep the per-user mastery lookup out of the picture (no backend in tests).
const { fetchConceptMastery } = vi.hoisted(() => ({ fetchConceptMastery: vi.fn() }));
vi.mock("@/lib/db/concept-mastery-server", () => ({ fetchConceptMastery }));

import { POST } from "@/app/api/quiz/route";
import { __resetRateLimit } from "@/lib/rate-limit";
import { CURATED_QUESTIONS } from "@/lib/learning/question-bank-data";

const curatedPrompts = new Set(CURATED_QUESTIONS.map((q) => q.prompt));

function post(body: unknown, ip: string) {
  return POST(
    new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

/** Configure a real provider whose every call fails — the production symptom. */
function configureFailingGemini() {
  vi.stubEnv("LLM_PROVIDER", "gemini");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("gemini down");
    }),
  );
}

beforeEach(() => {
  __resetRateLimit();
  fetchConceptMastery.mockReset();
  fetchConceptMastery.mockResolvedValue(new Map());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("curated fallback when the LLM fails for covered content", () => {
  it("serves curated questions (flagged) for a subject with curated coverage", async () => {
    configureFailingGemini();

    const res = await post({ domain: "mathematics", difficulty: 2, count: 4 }, "curated-ip");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("curated");
    expect(data.fallback).toBe(true);
    expect(data.questions.length).toBeGreaterThan(0);
    // Every served question must come from the curated bank — never a mock
    // placeholder or an unrelated sample.
    for (const q of data.questions) {
      expect(curatedPrompts.has(q.prompt), q.prompt).toBe(true);
      expect(q.conceptId).toBeTruthy();
    }
  });
});

describe("temporarily unavailable when the LLM fails for uncovered content", () => {
  it("returns 503 (no unrelated samples) for a concept with no curated coverage", async () => {
    configureFailingGemini();

    // "integrals" is a real taxonomy concept but has no curated questions.
    const res = await post(
      {
        domain: "mathematics",
        difficulty: 3,
        count: 4,
        scope: { level: "concept", id: "integrals" },
      },
      "unavailable-ip",
    );
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.reason).toBe("unavailable");
    expect(data.error).toMatch(/temporarily unavailable/i);
    expect(data.questions).toBeUndefined();
  });
});
