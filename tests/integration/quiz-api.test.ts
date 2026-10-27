// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/quiz/route";
import { __resetRateLimit } from "@/lib/rate-limit";

function post(body: unknown, ip = "test-ip") {
  return POST(
    new Request("http://localhost/api/quiz", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => __resetRateLimit());

describe("POST /api/quiz", () => {
  it("returns schema-valid MCQs for a known domain (mock provider)", async () => {
    const res = await post({ domain: "mathematics", difficulty: 3, count: 4 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provider).toBe("mock");
    expect(data.questions).toHaveLength(4);
    for (const q of data.questions) {
      expect(q.id).toBeTruthy();
      expect(q.conceptId).toBe("mathematics");
      expect(q.format).toBe("mcq");
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndices).toHaveLength(1);
    }
  });

  it("rejects an invalid difficulty with 400", async () => {
    const res = await post({ domain: "mathematics", difficulty: 9 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown domain", async () => {
    const res = await post({ domain: "does-not-exist", difficulty: 3 });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed body", async () => {
    const res = await POST(
      new Request("http://localhost/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "test-ip" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rate-limits after too many requests", async () => {
    for (let i = 0; i < 20; i += 1) {
      await post({ domain: "science", difficulty: 2, count: 1 }, "flood-ip");
    }
    const res = await post({ domain: "science", difficulty: 2, count: 1 }, "flood-ip");
    expect(res.status).toBe(429);
  });
});
