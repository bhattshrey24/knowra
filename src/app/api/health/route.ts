import { NextResponse } from "next/server";
import { cleanEnv, getLLMProvider } from "@/lib/llm";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Non-secret runtime diagnostics. Reports which LLM provider the server
 * actually resolves and what the key env vars *look like* (presence and raw
 * shape) — never their values — so a misconfigured deployment (e.g. quoted
 * `LLM_PROVIDER`, missing key, wrong environment scope) can be diagnosed from
 * production without exposing credentials.
 *
 * `llmProviderRaw` is JSON-encoded on purpose: a clean value prints as
 * "gemini", a quote-wrapped one prints as "\"gemini\"", and trailing
 * whitespace is visible too — the usual cause of a silent drop to mock.
 */
export function GET(): Response {
  const rawProvider = process.env.LLM_PROVIDER;
  const geminiKey = cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  return NextResponse.json({
    provider: getLLMProvider().id,
    llmProviderRaw: JSON.stringify(rawProvider ?? null),
    llmProviderResolved: cleanEnv(rawProvider).toLowerCase() || null,
    hasGeminiKey: geminiKey.length > 0,
    geminiKeyLength: geminiKey.length, // length only — never the key itself
    geminiModel: cleanEnv(process.env.GEMINI_MODEL) || "(default)",
    supabaseConfigured: isSupabaseConfigured(),
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
