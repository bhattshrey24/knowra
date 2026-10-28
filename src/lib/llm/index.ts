/**
 * Provider factory. Returns the configured LLM backend, defaulting to the free
 * mock provider when no real key is set — so the app runs end-to-end for free
 * and in CI. Callers depend only on the `LLMProvider` interface.
 */

import { GeminiProvider } from "@/lib/llm/gemini";
import { MockLLMProvider } from "@/lib/llm/mock";
import type { LLMProvider } from "@/lib/llm/provider";

export type { LLMProvider } from "@/lib/llm/provider";

// Keys shipped in .env.example — treated as "unset" so a copied template
// falls back to the free mock provider instead of failing against a bad key.
const PLACEHOLDER_KEYS = new Set(["", "your-gemini-key"]);

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

  if (provider === "gemini" && !PLACEHOLDER_KEYS.has(geminiKey)) {
    // Optional GEMINI_MODEL / GEMINI_TIMEOUT_MS overrides; defaults used when unset.
    const timeout = Number(process.env.GEMINI_TIMEOUT_MS) || undefined;
    return new GeminiProvider(geminiKey, process.env.GEMINI_MODEL || undefined, undefined, timeout);
  }
  return new MockLLMProvider();
}
