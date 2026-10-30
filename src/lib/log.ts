import "server-only";

/**
 * Minimal, zero-dependency structured logger for server code (route handlers,
 * server actions, middleware, LLM + Supabase access).
 *
 * Why not a library: logs just need to reach stdout/stderr. The local terminal
 * shows them directly, and Vercel Runtime Logs capture whatever a Node/Edge
 * function writes to the console — so `console.*` is all the transport we need,
 * and we stay at $0 with no new dependency.
 *
 * - Production: one JSON object per line (`{level,time,scope,msg,...ctx}`) so
 *   Vercel's log viewer can filter/search by field.
 * - Development: a compact, human-readable line for the terminal.
 *
 * Levels map to the right stream (ERROR/WARN → stderr, INFO → stdout) so log
 * drains and severity filters classify them correctly.
 *
 * Secrets safety: `context` is always run through a redactor that masks keys
 * that look sensitive (tokens, passwords, api keys, auth headers, cookies,
 * emails) and truncates oversized strings — so callers can't accidentally leak
 * a credential or dump a huge payload. Still, prefer logging ids over objects.
 */

export type LogLevel = "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

/** Keys whose values are masked wherever they appear in a context object. */
const SENSITIVE_KEY =
  /(pass(word|wd)?|secret|token|api[-_]?key|apikey|auth(orization)?|cookie|bearer|service[-_]?role|credential|email|anon[-_]?key|private[-_]?key)/i;

const REDACTED = "[redacted]";
const MAX_STRING = 512; // cap any single logged string so payloads can't flood logs
const MAX_DEPTH = 4;

const isProd = process.env.NODE_ENV === "production";

/** Recursively mask sensitive keys and truncate long strings in `value`. */
function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[depth-limited]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}

/**
 * Normalize an unknown thrown value into a safe, loggable shape: message + name
 * (+ stack for errors). Never spreads the raw error, so enumerable props that
 * might hold tokens aren't logged.
 */
export function errorContext(err: unknown): LogContext {
  if (err instanceof Error) {
    return { err: err.message, errName: err.name, ...(err.stack ? { stack: err.stack } : {}) };
  }
  return { err: typeof err === "string" ? err : String(err) };
}

function emit(level: LogLevel, scope: string, msg: string, context?: LogContext): void {
  const safe = context ? (redact(context) as LogContext) : undefined;
  const line = isProd
    ? JSON.stringify({ level, time: new Date().toISOString(), scope, msg, ...safe })
    : `${new Date().toISOString()} ${level.toUpperCase()} [${scope}] ${msg}` +
      (safe && Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "");

  // Route to the correct stream so severity is preserved for log drains.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  /** Derive a logger that merges `bound` context into every line (e.g. userId). */
  child(bound: LogContext): Logger;
}

/**
 * Create a logger bound to a `scope` (the operation/module, e.g. "api/quiz").
 * `bound` context is merged into — and overridden by — each call's context.
 */
export function createLogger(scope: string, bound: LogContext = {}): Logger {
  const withBound = (context?: LogContext): LogContext | undefined => {
    if (!context) return Object.keys(bound).length ? bound : undefined;
    return { ...bound, ...context };
  };
  return {
    info: (msg, context) => emit("info", scope, msg, withBound(context)),
    warn: (msg, context) => emit("warn", scope, msg, withBound(context)),
    error: (msg, context) => emit("error", scope, msg, withBound(context)),
    child: (extra) => createLogger(scope, { ...bound, ...extra }),
  };
}
