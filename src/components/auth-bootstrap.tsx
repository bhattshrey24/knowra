"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/db/client";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Silently establishes an anonymous Supabase session on first load so a
 * learner's attempts, mastery, and flashcards persist without a login wall.
 * No-ops when Supabase isn't configured (the app then runs stateless on the
 * mock provider). Users can later upgrade to a real account (Phase 6).
 */
export function AuthBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void supabase.auth.signInAnonymously();
    });
  }, []);

  return null;
}
