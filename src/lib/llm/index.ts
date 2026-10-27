/**
 * Provider factory. Returns the configured LLM backend, defaulting to the free
 * mock provider when no real key is set — so the app runs end-to-end for free
 * and in CI. Callers depend only on the `LLMProvider` interface.
 */

import { GeminiProvider } from "@/lib/llm/gemini";
import { MockLLMProvider } from "@/lib/llm/mock";
import type { LLMProvider } from "@/lib/llm/provider";

export type { LLMProvider } from "@/lib/llm/provider";

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (provider === "gemini" && geminiKey) {
    return new GeminiProvider(geminiKey);
  }
  return new MockLLMProvider();
}
