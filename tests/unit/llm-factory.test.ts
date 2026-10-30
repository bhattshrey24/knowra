import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanEnv, getLLMProvider } from "@/lib/llm";

/**
 * Provider selection must survive how real deployments store env vars. Dotenv
 * strips quotes from .env files, but dashboards (Vercel) keep the raw string,
 * so a value entered as `"gemini"` arrives quoted — the common cause of a
 * production app silently serving mock questions despite a configured provider.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cleanEnv", () => {
  it("trims whitespace", () => {
    expect(cleanEnv("  gemini  ")).toBe("gemini");
  });

  it("strips a single pair of wrapping quotes", () => {
    expect(cleanEnv('"gemini"')).toBe("gemini");
    expect(cleanEnv("'gemini'")).toBe("gemini");
    expect(cleanEnv('  "gemini" ')).toBe("gemini");
  });

  it("leaves unquoted values and inner quotes alone", () => {
    expect(cleanEnv("gemini")).toBe("gemini");
    expect(cleanEnv('ab"cd')).toBe('ab"cd');
  });

  it("handles undefined", () => {
    expect(cleanEnv(undefined)).toBe("");
  });
});

describe("getLLMProvider env tolerance", () => {
  it("selects gemini even when LLM_PROVIDER is quoted (Vercel dashboard case)", () => {
    vi.stubEnv("LLM_PROVIDER", '"gemini"');
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-real-looking-key");
    expect(getLLMProvider().id).toBe("gemini");
  });

  it("falls back to mock when gemini is selected but the key is a placeholder", () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(getLLMProvider().id).toBe("mock");
  });

  it("defaults to mock when LLM_PROVIDER is unset", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    expect(getLLMProvider().id).toBe("mock");
  });
});
