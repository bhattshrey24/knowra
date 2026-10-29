"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/db/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
    }

    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAnonymous(Boolean(user.is_anonymous));
        if (!user.is_anonymous) {
          // Already logged in permanently, redirect to profile
          router.replace("/profile");
        }
      }
    });
  }, [router]);

  async function handleOAuth(provider: "github" = "github") {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured yet.");
      return;
    }
    setOauthLoading(provider);
    setError(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (oauthErr) {
        const msg = oauthErr.message?.toLowerCase() ?? "";
        if (
          msg.includes("not enabled") ||
          msg.includes("unsupported provider") ||
          oauthErr.status === 400
        ) {
          throw new Error(
            "GitHub OAuth is not enabled in this Supabase project. To enable it, navigate to Supabase Dashboard > Authentication > Providers > GitHub, toggle it on, and configure your Client ID and Secret. In the meantime, please use Email and Password below!",
          );
        }
        throw oauthErr;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "GitHub sign-in failed");
      setOauthLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        // Register or upgrade account via server API ($0 rate-limit bypass with auto-confirm)
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            displayName: displayName.trim() || undefined,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to create account");
        }

        // Establish the browser session immediately
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginErr) throw loginErr;

        setSuccess(
          result.upgraded
            ? "Account created successfully! Your previous quiz history has been preserved."
            : "Account created successfully! Welcome to Knowra.",
        );

        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 800);
      } else {
        // Sign in with existing credentials
        const { data, error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginErr) throw loginErr;

        if (data.user) {
          setSuccess("Signed in successfully!");
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 800);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link
        href="/home"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>

      <Card className="border-border">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {isAnonymous ? "Save your progress" : "Welcome back"}
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {isAnonymous
              ? "Link an account to sync your knowledge profile, attempts, and flashcards across devices."
              : "Sign in to access your saved knowledge base."}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {isAnonymous && (
            <div className="border-primary/30 bg-primary/5 text-primary dark:text-primary-foreground flex items-start gap-2.5 rounded-lg border p-3 text-xs">
              <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Your data is safe:</strong> All your current quiz attempts, mastery scores,
                and flashcards will be linked to your new account.
              </span>
            </div>
          )}

          {/* GitHub OAuth Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("github")}
            disabled={loading || Boolean(oauthLoading)}
            className="w-full gap-2 text-xs"
          >
            {oauthLoading === "github" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            Continue with GitHub
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-card text-muted-foreground px-2">or with email</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`rounded-md py-1.5 font-medium transition-colors ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isAnonymous ? "Create account" : "Sign up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`rounded-md py-1.5 font-medium transition-colors ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-foreground text-xs font-medium" htmlFor="display-name">
                  Name (optional)
                </label>
                <input
                  id="display-name"
                  type="text"
                  placeholder="e.g. Marie Curie"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full rounded-md border px-3 py-2 text-xs outline-none focus-visible:ring-2"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-foreground text-xs font-medium" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-3 left-3 size-3.5" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full rounded-md border py-2 pr-3 pl-9 text-xs outline-none focus-visible:ring-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground text-xs font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-3 left-3 size-3.5" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full rounded-md border py-2 pr-3 pl-9 text-xs outline-none focus-visible:ring-2"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-destructive text-xs">
                {error}
              </p>
            )}

            {success && (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />
                {success}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full text-xs">
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  {mode === "signup" ? "Creating account…" : "Signing in…"}
                </>
              ) : mode === "signup" ? (
                "Create free account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
