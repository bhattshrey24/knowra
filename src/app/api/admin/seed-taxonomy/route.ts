import { NextResponse } from "next/server";
import { seedTaxonomy } from "@/lib/db/taxonomy-server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

/**
 * One-off trigger to load the shared taxonomy seed into the database. Guarded
 * by a bearer token (`SEED_TOKEN`); the route is disabled entirely unless that
 * env var is set, so it can never run with an empty/guessable secret. The seed
 * itself is idempotent, so calling this repeatedly is safe.
 */
export async function POST(req: Request): Promise<Response> {
  const token = process.env.SEED_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Seeding is disabled (SEED_TOKEN not set)" },
      { status: 404 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (provided !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });
  }

  try {
    const result = await seedTaxonomy();
    return NextResponse.json({ ok: true, seeded: result });
  } catch (err) {
    console.error("[seed-taxonomy] failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Failed to seed taxonomy" }, { status: 500 });
  }
}
