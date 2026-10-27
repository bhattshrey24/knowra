// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/topics/route";

describe("POST /api/topics (no backend)", () => {
  it("returns 503 when custom topics aren't available", async () => {
    const res = await POST(
      new Request("http://localhost/api/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Photosynthesis" }),
      }),
    );
    expect(res.status).toBe(503);
  });
});
