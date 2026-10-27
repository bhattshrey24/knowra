import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Service-role client that BYPASSES Row Level Security. Use only in trusted
 * server code for operations the user cannot do themselves (e.g. seeding the
 * concept taxonomy). The `server-only` import makes bundling this into client
 * code a build error. Never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
