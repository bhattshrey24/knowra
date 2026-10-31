// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { __resetRateLimit } from "@/lib/rate-limit";

function post(body: unknown, ip: string) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

/** A Gemini REST response whose text body is the given plain-text reply. */
function geminiTextResponse(text: string): Response {
  const body = { candidates: [{ content: { parts: [{ text }] } }] };
  return new Response(JSON.stringify(body), { status: 200 });
}

beforeEach(() => __resetRateLimit());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/chat", () => {
  it("answers deterministically with the mock provider (no key)", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    const res = await post({ message: "what should I study next?" }, "chat-mock");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("mock");
    expect(data.aiGenerated).toBe(false);
    expect(typeof data.reply).toBe("string");
    expect(data.reply.length).toBeGreaterThan(0);
  });

  it("uses the LLM reply when generation succeeds", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => geminiTextResponse("Focus on fractions first, then limits.")),
    );

    const res = await post({ message: "what next?" }, "chat-gemini");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("gemini");
    expect(data.aiGenerated).toBe(true);
    expect(data.reply).toBe("Focus on fractions first, then limits.");
  });

  it("falls back to a deterministic reply when the LLM fails (never dead-ends)", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("gemini down");
      }),
    );

    const res = await post({ message: "what should I study?" }, "chat-fallback");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.provider).toBe("fallback");
    expect(data.aiGenerated).toBe(false);
    expect(data.reply.length).toBeGreaterThan(0);
  });

  it("rejects an empty message with 400", async () => {
    const res = await post({ message: "" }, "chat-empty");
    expect(res.status).toBe(400);
  });

  it("rejects a missing message with 400", async () => {
    const res = await post({ history: [] }, "chat-missing");
    expect(res.status).toBe(400);
  });
});
