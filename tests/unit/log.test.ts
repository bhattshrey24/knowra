import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, errorContext } from "@/lib/log";

/**
 * The logger must: route levels to the right console stream, never emit values
 * for sensitive keys (secrets/PII), truncate oversized strings, and — in
 * production — emit one queryable JSON object per line for Vercel Runtime Logs.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("createLogger — level routing", () => {
  it("sends error/warn to stderr and info to stdout, with scope and message", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    const log = createLogger("api/test");

    log.error("boom");
    log.warn("careful");
    log.info("ok");

    expect(err).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0][0])).toContain("api/test");
    expect(String(err.mock.calls[0][0])).toContain("boom");
  });
});

describe("createLogger — redaction", () => {
  function emittedFor(context: Record<string, unknown>): string {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger("test").error("msg", context);
    return String(spy.mock.calls[0][0]);
  }

  it("masks sensitive keys and keeps safe ids", () => {
    const line = emittedFor({
      password: "hunter2",
      token: "tok_abc",
      email: "user@example.com",
      authorization: "Bearer xyz",
      apiKey: "sk-123",
      userId: "u-1",
    });
    expect(line).not.toContain("hunter2");
    expect(line).not.toContain("tok_abc");
    expect(line).not.toContain("user@example.com");
    expect(line).not.toContain("sk-123");
    expect(line).toContain("[redacted]");
    expect(line).toContain("u-1"); // non-sensitive id is preserved
  });

  it("redacts nested sensitive keys", () => {
    const line = emittedFor({ outer: { serviceRoleKey: "super-secret" } });
    expect(line).not.toContain("super-secret");
    expect(line).toContain("[redacted]");
  });

  it("truncates oversized strings", () => {
    const line = emittedFor({ blob: "a".repeat(1000) });
    expect(line).toContain("[truncated]");
    expect(line.length).toBeLessThan(1000);
  });
});

describe("errorContext", () => {
  it("extracts message, name and stack from an Error", () => {
    const ctx = errorContext(new Error("boom"));
    expect(ctx.err).toBe("boom");
    expect(ctx.errName).toBe("Error");
    expect(typeof ctx.stack).toBe("string");
  });

  it("stringifies non-Error throws", () => {
    expect(errorContext("nope").err).toBe("nope");
    expect(errorContext(42).err).toBe("42");
  });
});

describe("child", () => {
  it("merges bound context into every line", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger("test").child({ requestId: "r-9" }).info("hello");
    expect(String(spy.mock.calls[0][0])).toContain("r-9");
  });
});

describe("production output", () => {
  it("emits one parseable JSON object per line", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { createLogger: freshLogger } = await import("@/lib/log");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    freshLogger("api/quiz").error("failed", { provider: "gemini", password: "x" });

    const parsed = JSON.parse(String(spy.mock.calls[0][0]));
    expect(parsed).toMatchObject({ level: "error", scope: "api/quiz", msg: "failed" });
    expect(parsed.provider).toBe("gemini");
    expect(parsed.password).toBe("[redacted]");
    expect(typeof parsed.time).toBe("string");
  });
});
