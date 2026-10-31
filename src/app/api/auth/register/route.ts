import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createLogger, errorContext } from "@/lib/log";

export const runtime = "nodejs";

const log = createLogger("api/auth/register");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().max(100).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid credentials";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { email, password, displayName } = parsed.data;
  const resolvedName = displayName?.trim() || email.split("@")[0];

  try {
    const userClient = await createClient();
    const {
      data: { user: currentUser },
    } = await userClient.auth.getUser();

    const admin = createAdminClient();

    if (currentUser?.is_anonymous) {
      // Upgrade existing anonymous user in-place to preserve all quiz attempts and flashcards
      const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(
        currentUser.id,
        {
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: resolvedName },
        },
      );

      if (updateErr) {
        // Client-facing (e.g. email already in use). No email/PII in the log.
        log.warn("anonymous upgrade rejected", {
          userId: currentUser.id,
          ...errorContext(updateErr),
        });
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      await admin.from("profiles").upsert({
        id: currentUser.id,
        display_name: resolvedName,
        updated_at: new Date().toISOString(),
      });

      log.info("anonymous user upgraded to permanent", { userId: updated.user.id });
      return NextResponse.json({
        success: true,
        upgraded: true,
        userId: updated.user.id,
      });
    }

    // New permanent user creation with auto-confirmation ($0 SMTP bypass)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: resolvedName },
    });

    if (createErr) {
      // Client-facing (e.g. email already registered). No email/PII in the log.
      log.warn("registration rejected", errorContext(createErr));
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    await admin.from("profiles").upsert({
      id: created.user.id,
      display_name: resolvedName,
      updated_at: new Date().toISOString(),
    });

    log.info("new user registered", { userId: created.user.id });
    return NextResponse.json({
      success: true,
      upgraded: false,
      userId: created.user.id,
    });
  } catch (err: unknown) {
    log.error("registration failed", errorContext(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register account" },
      { status: 500 },
    );
  }
}
