import "server-only";
import { WebSocket } from "ws";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

// supabase-js eagerly builds a realtime client that needs a global WebSocket,
// which Node <22 lacks. Supplying `ws` as the transport keeps the server-side
// client working on Node 20 (local/CI) and is harmless on Node 22 (Vercel).
// See improve.md — this can be dropped once the runtime is Node 22+ everywhere.
const realtime = { transport: WebSocket as unknown as typeof globalThis.WebSocket };

/**
 * Service-role client that BYPASSES Row Level Security. Use only in trusted
 * server code for operations the user cannot do themselves (e.g. seeding the
 * concept taxonomy). The `server-only` import makes bundling this into client
 * code a build error. Never expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime,
  });
}
