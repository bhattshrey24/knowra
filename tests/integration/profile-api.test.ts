// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/profile/route";

describe("/api/profile (unauthenticated / no backend)", () => {
  it("GET returns 401 when unauthenticated", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when unauthenticated", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Ada" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when unauthenticated", async () => {
    const res = await DELETE();
    expect(res.status).toBe(401);
  });
});
