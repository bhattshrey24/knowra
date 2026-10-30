import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { createLogger, errorContext } from "@/lib/log";

const log = createLogger("auth/middleware");

/**
 * Keeps the Supabase auth session fresh on each request by syncing cookies.
 * Runs in the edge runtime (which has a native WebSocket), so no `ws` shim is
 * needed here. No-ops when Supabase isn't configured, so the app runs on the
 * mock provider without any keys.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the user to trigger a token refresh if needed. A thrown failure here
  // (network/Supabase outage) is rare; log it but never block the request.
  try {
    await supabase.auth.getUser();
  } catch (err) {
    log.warn("session refresh failed", { path: request.nextUrl.pathname, ...errorContext(err) });
  }
  return response;
}
