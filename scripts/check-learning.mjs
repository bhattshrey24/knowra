// Confirms the Phase 2 learning tables exist and shows row counts.
// Run: `node --env-file=.env.local scripts/check-learning.mjs`
// Uses the service role (bypasses RLS) and prints only counts — never secrets.
import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes("YOUR-PROJECT")) {
  console.error("✗ Supabase env not set in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const tables = ["quiz_attempts", "attempt_answers", "domain_mastery", "flashcards"];
let missing = false;

for (const table of tables) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    missing = true;
  } else {
    console.log(`✓ ${table}: ${count} rows`);
  }
}

if (missing) {
  console.error("\nApply supabase/migrations/0002_learning.sql (SQL Editor), then re-run.");
  process.exit(2);
}
console.log("\n✓ Phase 2 tables present and reachable.");
