/**
 * Minimal fixed-window rate limiter. Best-effort and in-memory: it protects a
 * single server instance and the free LLM quota. On serverless (Vercel) each
 * instance has its own map, so for hard guarantees move this to a shared store
 * (e.g. Supabase or Upstash) — tracked in improve.md.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, max = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, retryAfterSeconds: 0 };
}

/** Test helper: clears all buckets. */
export function __resetRateLimit(): void {
  buckets.clear();
}
