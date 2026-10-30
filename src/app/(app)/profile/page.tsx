"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/db/client";
import { isSupabaseConfigured } from "@/lib/env";

interface ProfileData {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Danger zone delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = (await res.json()) as ProfileData;
          setProfile(data);
          setDisplayNameInput(data.displayName || "");
        }
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void fetchProfile();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayNameInput.trim()) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: displayNameInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setSaveSuccess(true);
      setProfile((prev) => (prev ? { ...prev, displayName: displayNameInput.trim() } : null));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Clear local session and redirect
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }

      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to view your profile.</p>
        <ButtonLink href="/login">Sign in or Create Account</ButtonLink>
      </div>
    );
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/home"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile & settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account details, identity linking, and personal preferences.
        </p>
      </div>

      {/* Account Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-lg font-bold">
                {(profile.displayName || profile.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {profile.displayName || "Anonymous Learner"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {profile.email || "Temporary session on this device"}
                </p>
              </div>
            </div>

            <div>
              {profile.isAnonymous ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Guest session
                  </Badge>
                  <ButtonLink size="sm" href="/login">
                    Upgrade
                  </ButtonLink>
                </div>
              ) : (
                <Badge
                  variant="default"
                  className="gap-1 bg-emerald-600 text-xs hover:bg-emerald-600"
                >
                  <CheckCircle2 className="size-3" />
                  Synced account
                </Badge>
              )}
            </div>
          </div>

          <div className="text-muted-foreground grid grid-cols-2 gap-3 border-t pt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Member since: {memberSince}
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Shield className="size-3.5 shrink-0" />
              ID: <span className="truncate font-mono text-[10px]">{profile.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Display name</CardTitle>
          <p className="text-muted-foreground text-xs">
            How your name appears in the app and on your knowledge profile.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-3">
            <div className="space-y-1">
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Enter display name"
                className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full max-w-sm rounded-md border px-3 py-1.5 text-xs outline-none focus-visible:ring-2"
              />
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}
            {saveSuccess && (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" /> Name updated successfully.
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={
                saving || !displayNameInput.trim() || displayNameInput === profile.displayName
              }
              className="text-xs"
            >
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone: Delete Account & Data (Phase 8.4) */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-destructive flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Danger zone
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Permanently delete your user account and purge all associated quiz attempts, mastery
            records, and spaced-repetition flashcards. This action cannot be undone.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!confirmDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
            >
              <Trash2 className="size-3.5" />
              Delete account & all data
            </Button>
          ) : (
            <div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-4 text-xs">
              <p className="text-destructive font-semibold">
                Are you absolutely sure you want to delete your account?
              </p>
              <p className="text-muted-foreground">
                All your progress, attempts history, and flashcards will be permanently erased.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="text-xs"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Yes, permanently delete my account"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
