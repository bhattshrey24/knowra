import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (error || errorDescription) {
    const errorMsg = errorDescription || error || "OAuth authorization failed";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
