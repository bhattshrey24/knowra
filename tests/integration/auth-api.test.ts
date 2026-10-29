// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "Password123!",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects passwords shorter than 6 characters", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "learner@example.com",
          password: "123",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("6 characters");
  });

  it("returns 503 when Supabase backend is not configured", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "learner@example.com",
          password: "ValidPassword123!",
        }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("Database not configured");
  });
});
