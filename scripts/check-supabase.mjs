// Verifies the Supabase connection and that the baseline migration is applied.
// Run WITHOUT exposing secrets to anyone: `node --env-file=.env.local scripts/check-supabase.mjs`
// Prints only a status line — never the keys.
import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes("YOUR-PROJECT") || key.startsWith("your-")) {
  console.error("✗ Supabase env not set. Fill real values into .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});
const { error } = await supabase.from("profiles").select("id").limit(1);

if (error) {
  if (/relation .*profiles.* does not exist|Could not find the table/i.test(error.message)) {
    console.error("✗ Connected, but the 'profiles' table is missing.");
    console.error("  Apply supabase/migrations/0001_init.sql (SQL Editor or `supabase db push`).");
    process.exit(2);
  }
  console.error(`✗ Connected, but query failed: ${error.message}`);
  process.exit(2);
}

console.log("✓ Supabase connected and the 'profiles' table exists. Ready for Phase 2.");
