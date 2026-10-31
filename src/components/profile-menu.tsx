"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { createClient } from "@/lib/db/client";
import { isSupabaseConfigured } from "@/lib/env";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAnonymous(Boolean(user.is_anonymous));
        setEmail(user.email ?? null);
        setDisplayName(
          (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || null,
        );
      } else {
        setIsAnonymous(true);
        setEmail(null);
        setDisplayName(null);
      }
      setLoading(false);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAnonymous(Boolean(session.user.is_anonymous));
        setEmail(session.user.email ?? null);
        setDisplayName(
          (session.user.user_metadata?.display_name as string) ||
            session.user.email?.split("@")[0] ||
            null,
        );
      } else {
        setIsAnonymous(true);
        setEmail(null);
        setDisplayName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/home");
    router.refresh();
  }

  if (loading) {
    return <div className="bg-muted/60 size-8 animate-pulse rounded-full" />;
  }

  // If anonymous (or no session), show simple Sign in / Sync button
  if (isAnonymous) {
    return (
      <ButtonLink
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
        href="/login"
      >
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">Sign in</span>
      </ButtonLink>
    );
  }

  const initials = displayName
    ? displayName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label="User account menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 absolute right-0 z-50 mt-2 w-56 rounded-xl border p-2 shadow-lg">
          <div className="mb-1 border-b px-2 py-1.5">
            <p className="truncate text-sm font-semibold">{displayName || "Account"}</p>
            {email && <p className="text-muted-foreground truncate text-xs">{email}</p>}
          </div>

          <div className="space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <User className="text-muted-foreground size-3.5" />
              Profile & settings
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
