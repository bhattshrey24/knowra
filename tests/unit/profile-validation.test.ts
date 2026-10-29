import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/lib/validation/profile";

describe("updateProfileSchema", () => {
  it("accepts valid display name", () => {
    const res = updateProfileSchema.safeParse({ displayName: "Ada Lovelace" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.displayName).toBe("Ada Lovelace");
    }
  });

  it("trims whitespace from display name", () => {
    const res = updateProfileSchema.safeParse({ displayName: "   Alan Turing   " });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.displayName).toBe("Alan Turing");
    }
  });

  it("rejects empty or whitespace-only display name", () => {
    const emptyRes = updateProfileSchema.safeParse({ displayName: "" });
    expect(emptyRes.success).toBe(false);

    const spaceRes = updateProfileSchema.safeParse({ displayName: "   " });
    expect(spaceRes.success).toBe(false);
  });

  it("rejects excessively long display name (>50 chars)", () => {
    const longName = "a".repeat(51);
    const res = updateProfileSchema.safeParse({ displayName: longName });
    expect(res.success).toBe(false);
  });
});
