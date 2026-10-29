"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { quizHref, rankSearchItems, type SearchItem } from "@/lib/taxonomy/catalogue";
import type { TaxonomyLevel } from "@/types/learning";

const EXAMPLES = ["Guitar chords", "World War II", "Python decorators"];

const LEVEL_BADGE: Record<
  TaxonomyLevel,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  subject: { label: "Subject", variant: "default" },
  topic: { label: "Topic", variant: "secondary" },
  concept: { label: "Concept", variant: "outline" },
};

export function HomeSearch({
  items,
  canCreateCustom,
}: {
  items: SearchItem[];
  canCreateCustom: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmed = query.trim();
  const matches = useMemo(() => rankSearchItems(items, trimmed), [items, trimmed]);

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

  const showNoMatch = trimmed.length >= 2 && matches.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any subject, topic or concept…"
          aria-label="Search any subject, topic or concept"
          className="bg-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring/40 h-12 w-full rounded-xl border pr-3 pl-10 text-base transition-colors outline-none focus-visible:ring-2"
        />
      </div>

      {/* Suggestions */}
      {matches.length > 0 && (
        <ul className="divide-border overflow-hidden rounded-xl border">
          {matches.map((item) => {
            const badge = LEVEL_BADGE[item.level];
            return (
              <li key={`${item.level}:${item.id}`}>
                <button
                  type="button"
                  onClick={() => router.push(quizHref(item))}
                  className="hover:bg-muted flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    {item.parentLabel && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {item.parentLabel}
                      </span>
                    )}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* No taxonomy match → offer a custom topic */}
      {showNoMatch &&
        (canCreateCustom ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
            <p className="text-muted-foreground text-sm">
              Nothing in the catalogue matches “{trimmed}”.
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
                  Quiz me on “{trimmed}”
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            Nothing matches “{trimmed}”. Custom topics need an account.
          </p>
        ))}

      {/* Try: examples */}
      {!trimmed && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-muted-foreground text-sm">Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                "hover:border-primary/40 hover:bg-muted",
              )}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
