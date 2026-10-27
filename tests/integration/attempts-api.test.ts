// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/attempts/route";

/**
 * Without Supabase configured (as in CI / mock mode), the attempts endpoint
 * must degrade gracefully — never crash — so the quiz still shows results.
 */
describe("POST /api/attempts (no backend)", () => {
  it("responds persisted:false instead of erroring", async () => {
    const res = await POST(
      new Request("http://localhost/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: "mathematics",
          difficulty: 3,
          answers: [{ prompt: "2+2?", selected: [1], correctIndices: [1] }],
        }),
      }),
    );
    const data = await res.json();
    expect(data.persisted).toBe(false);
  });
});
