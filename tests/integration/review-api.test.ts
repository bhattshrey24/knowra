// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/flashcards/review/route";

describe("POST /api/flashcards/review (no backend)", () => {
  it("degrades to updated:false instead of erroring", async () => {
    const res = await POST(
      new Request("http://localhost/api/flashcards/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cardId: "00000000-0000-0000-0000-000000000000",
          grade: "good",
        }),
      }),
    );
    const data = await res.json();
    expect(data.updated).toBe(false);
  });
});
