// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/classify/route";
import { __resetRateLimit } from "@/lib/rate-limit";

function post(query: string, ip: string) {
  return POST(
    new Request("http://localhost/api/classify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ query }),
    }),
  );
}

beforeEach(() => __resetRateLimit());

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/classify", () => {
  it("reports 'temporarily unavailable' when the configured LLM is down", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("gemini down");
      }),
    );

    const res = await post("teach me about kintsugi", "classify-down-ip");
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.reason).toBe("unavailable");
    expect(data.error).toMatch(/temporarily unavailable/i);
    expect(data.classification).toBeUndefined();
  });

  it("still classifies with the mock provider when no real LLM is configured", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    const res = await post("teach me about photosynthesis", "classify-mock-ip");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.classification).toBeTruthy();
    expect(data.classification.subject.name).toBeTruthy();
  });
});
