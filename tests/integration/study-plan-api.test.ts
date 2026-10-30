// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/study-plan/route";
import { __resetRateLimit } from "@/lib/rate-limit";
import type { StudyPlan } from "@/types/learning";

function post(subject: unknown, ip: string) {
  return POST(
    new Request("http://localhost/api/study-plan", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ subject }),
    }),
  );
}

/** A Gemini REST response whose JSON body is the given study plan. */
function geminiPlanResponse(plan: unknown): Response {
  const body = { candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }] };
  return new Response(JSON.stringify(body), { status: 200 });
}

beforeEach(() => __resetRateLimit());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/study-plan", () => {
  it("returns a deterministic plan with the mock provider (no key)", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    const res = await post("mathematics", "sp-mock");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("mock");
    expect(data.plan.steps.length).toBeGreaterThan(0);
    // Every step is tied to a real concept id, with our concept name.
    for (const step of data.plan.steps as StudyPlan["steps"]) {
      expect(step.conceptId).toBeTruthy();
      expect(step.conceptName).toBeTruthy();
      expect(["learn", "review", "strengthen"]).toContain(step.action);
    }
  });

  it("uses the LLM plan when generation succeeds, guardrailed to real concepts", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        geminiPlanResponse({
          overview: "Start with the basics.",
          steps: [
            { conceptId: "fractions", action: "learn", reason: "Foundational for the rest." },
            // An invented concept the engine never selected — must be dropped.
            { conceptId: "totally-made-up", action: "learn", reason: "hallucinated" },
          ],
          encouragement: "One step at a time.",
        }),
      ),
    );

    const res = await post("mathematics", "sp-gemini");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("gemini");
    expect(data.aiGenerated).toBe(true);
    const ids = (data.plan.steps as StudyPlan["steps"]).map((s) => s.conceptId);
    expect(ids).toContain("fractions");
    expect(ids).not.toContain("totally-made-up"); // guardrail dropped it
  });

  it("falls back to a deterministic plan when the LLM fails (never dead-ends)", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("gemini down");
      }),
    );

    const res = await post("mathematics", "sp-fallback");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.aiGenerated).toBe(false);
    expect(data.provider).toBe("fallback");
    expect(data.plan.steps.length).toBeGreaterThan(0);
  });

  it("returns 404 for an unknown subject", async () => {
    const res = await post("does-not-exist", "sp-404");
    expect(res.status).toBe(404);
  });
});
