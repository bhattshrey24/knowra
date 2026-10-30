import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getTaxonomy, saveClassification } from "@/lib/db/taxonomy-server";
import { resolveClassification } from "@/lib/learning/classify";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/learn");

const bodySchema = z.object({
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(100),
  concept: z.string().min(1).max(100),
});

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * Save a (user-confirmed, possibly-edited) classification into the shared
 * taxonomy (Phase 6.3). The names are re-resolved server-side so the app — not
 * the client — decides reuse vs. new and keeps relationships valid. Returns the
 * ids to quiz on.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Saving requires an account." }, { status: 503 });
  }
  if (!rateLimit(`learn:${clientKey(req)}`).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

    const tax = await getTaxonomy();
    const resolved = resolveClassification(parsed.data, tax);
    const ids = await saveClassification(resolved);
    log.info("classification saved", { conceptId: ids.conceptId, topicId: ids.topicId });
    return NextResponse.json(ids);
  } catch (err) {
    log.error("save failed", errorContext(err));
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
