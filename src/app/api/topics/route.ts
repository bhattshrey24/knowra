import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { customSlug, normalizeTopicTitle } from "@/lib/learnable";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/topics");

const bodySchema = z.object({ title: z.string().min(2).max(80) });

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

export async function POST(req: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Custom topics require an account." }, { status: 503 });
  }
  if (!rateLimit(`topics:${clientKey(req)}`).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid title" }, { status: 400 });

  const title = normalizeTopicTitle(parsed.data.title);
  if (title.length < 2) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  const slug = customSlug(title);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

    const { error } = await supabase
      .from("custom_topics")
      .upsert({ user_id: user.id, slug, title }, { onConflict: "user_id,slug" });
    if (error) {
      log.error("custom topic upsert failed", { userId: user.id, slug, ...errorContext(error) });
      return NextResponse.json({ error: "Could not save topic" }, { status: 500 });
    }

    return NextResponse.json({ slug, title });
  } catch (err) {
    log.error("custom topic save failed", { slug, ...errorContext(err) });
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
