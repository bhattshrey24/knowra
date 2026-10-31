import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/db/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // OAuth return handling. Supabase's PKCE flow sends the user back with a
  // `?code=` (or `?error=`) that must be exchanged for a session at
  // /auth/callback. If the provider — or a Supabase Site-URL fallback — returns
  // them to a different page (e.g. the landing page `/`), that page has no
  // Supabase client to process the code, so the session is silently dropped and
  // the user still appears signed out. Forward any such request to the callback
  // so the session is established on the first attempt.
  if (
    request.method === "GET" &&
    pathname !== "/auth/callback" &&
    !pathname.startsWith("/api/") &&
    (searchParams.has("code") || searchParams.has("error"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) {
      url.searchParams.set("next", pathname === "/" ? "/dashboard" : pathname);
    }
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and the PWA/service-worker files.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
