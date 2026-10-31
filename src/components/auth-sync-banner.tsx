"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { createClient } from "@/lib/db/client";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthSyncBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    if (sessionStorage.getItem("knowra_sync_banner_dismissed")) {
      return;
    }

    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.is_anonymous) {
        setShow(true);
      }
    });
  }, []);

  function handleDismiss() {
    sessionStorage.setItem("knowra_sync_banner_dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="border-primary/30 bg-primary/5 relative mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs">
      <div className="flex items-center gap-2.5">
        <Sparkles className="text-primary size-4 shrink-0" />
        <span className="text-foreground">
          <strong>Sync across devices:</strong> You are currently using a guest session. Link an
          account to keep your knowledge profile and flashcards safe everywhere.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ButtonLink size="sm" variant="default" className="h-7 text-xs" href="/login">
          Save progress
          <ArrowRight className="ml-1 size-3" />
        </ButtonLink>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
