/**
 * Provider factory. Returns the configured LLM backend, defaulting to the free
 * mock provider when no real key is set — so the app runs end-to-end for free
 * and in CI. Callers depend only on the `LLMProvider` interface.
 */

import { GeminiProvider } from "@/lib/llm/gemini";
import { OllamaProvider } from "@/lib/llm/ollama";
import { MockLLMProvider } from "@/lib/llm/mock";
import type { LLMProvider } from "@/lib/llm/provider";

export type { LLMProvider } from "@/lib/llm/provider";

// Keys shipped in .env.example — treated as "unset" so a copied template
// falls back to the free mock provider instead of failing against a bad key.
const PLACEHOLDER_KEYS = new Set(["", "your-gemini-key"]);

/**
 * Normalize an env value: trim whitespace and strip a single pair of wrapping
 * quotes. Dotenv strips quotes from `.env.local`, but dashboards (e.g. Vercel)
 * store the raw string — so a value pasted as `"gemini"` arrives with literal
 * quotes and would never match `=== "gemini"`. Tolerating that here is the
 * difference between the configured provider working in prod or silently
 * dropping to mock.
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/^(['"])(.*)\1$/, "$2");
}

/**
 * Selects the LLM backend from `LLM_PROVIDER` (ollama | gemini | mock). Every
 * backend implements the same interface, so the rest of the app is identical
 * regardless of choice. Falls back to the free mock provider when a selected
 * provider isn't usable (e.g. gemini without a key).
 */
export function getLLMProvider(): LLMProvider {
  const provider = cleanEnv(process.env.LLM_PROVIDER).toLowerCase();

  if (provider === "ollama") {
    const timeout = Number(cleanEnv(process.env.OLLAMA_TIMEOUT_MS)) || undefined;
    return new OllamaProvider(
      cleanEnv(process.env.OLLAMA_BASE_URL) || undefined,
      cleanEnv(process.env.OLLAMA_MODEL) || undefined,
      undefined,
      timeout,
    );
  }

  const geminiKey = cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (provider === "gemini" && !PLACEHOLDER_KEYS.has(geminiKey)) {
    // Optional GEMINI_MODEL / GEMINI_TIMEOUT_MS overrides; defaults used when unset.
    const timeout = Number(cleanEnv(process.env.GEMINI_TIMEOUT_MS)) || undefined;
    return new GeminiProvider(
      geminiKey,
      cleanEnv(process.env.GEMINI_MODEL) || undefined,
      undefined,
      timeout,
    );
  }
  return new MockLLMProvider();
}
