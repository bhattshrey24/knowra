import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Runs as the signed-in user (anon key + their session cookie), so every query
 * is still constrained by Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only; the
          // session is refreshed by middleware instead. Safe to ignore.
        }
      },
    },
  });
}
