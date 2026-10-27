"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Sparkles } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DomainCard } from "@/components/domain-card";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";

export function DomainBrowser() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const canCreateCustom = isSupabaseConfigured();

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return DOMAINS;
    return DOMAINS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [trimmed]);

  async function startCustomTopic() {
    if (trimmed.length < 2 || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        const { slug } = (await res.json()) as { slug: string };
        router.push(`/quiz/${slug}`);
        return;
      }
    } catch {
      // fall through to re-enable the button
    }
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a subject, or type any topic…"
          aria-label="Search subjects and topics"
          className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring/40 h-11 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-2"
        />
      </div>

      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      )}

      {filtered.length === 0 &&
        (canCreateCustom && trimmed.length >= 2 ? (
          <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No preset subject matches &ldquo;{trimmed}&rdquo; — learn it as a custom topic.
            </p>
            <Button onClick={startCustomTopic} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Quiz me on &ldquo;{trimmed}&rdquo;
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No predefined subject matches &ldquo;{query}&rdquo;.
            {!canCreateCustom && " Custom topics need an account."}
          </div>
        ))}
    </div>
  );
}
