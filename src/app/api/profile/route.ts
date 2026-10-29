import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { updateProfileSchema } from "@/lib/validation/profile";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile: {
    display_name?: string | null;
    avatar_url?: string | null;
    settings?: unknown;
    created_at?: string;
  } | null = null;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name,avatar_url,settings,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.message.includes("avatar_url")) {
    // Fallback if migration 0010 (avatar_url) has not yet been applied to the hosted database
    const { data: fallbackData } = await supabase
      .from("profiles")
      .select("display_name,settings,created_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = fallbackData;
  } else {
    profile = data;
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    isAnonymous: Boolean(user.is_anonymous),
    displayName: profile?.display_name ?? user.user_metadata?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    createdAt: user.created_at,
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { displayName } = parsed.data;

    // Update profile table row
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() });

    if (profileError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Also update auth user metadata
    await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    return NextResponse.json({ success: true, displayName });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Service-role client deletes user from auth.users (cascades to all user tables)
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    // Sign out the current session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
