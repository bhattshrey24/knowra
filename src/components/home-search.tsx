"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LearnCreate } from "@/components/learn-create";
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
  const [learnQuery, setLearnQuery] = useState<string | null>(null);

  const trimmed = query.trim();
  const matches = useMemo(() => rankSearchItems(items, trimmed), [items, trimmed]);

  const showNoMatch = trimmed.length >= 2 && matches.length === 0;

  return (
    <div className="space-y-3">
      <div className="focus-within:border-primary/50 rounded-xl border p-3 transition-colors">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any subject, topic or concept…"
            aria-label="Search any subject, topic or concept"
            className="placeholder:text-muted-foreground h-8 w-full bg-transparent pr-2 pl-8 text-base outline-none"
          />
        </div>

        {!trimmed && (
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 border-t pt-2.5 text-sm">
            <CornerDownLeft className="size-3.5" />
            <span>Try:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {matches.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {matches.map((item) => {
            const badge = LEVEL_BADGE[item.level];
            return (
              <li key={`${item.level}:${item.id}`}>
                <button
                  type="button"
                  onClick={() => router.push(quizHref(item))}
                  className="hover:bg-muted flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
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

      {/* No taxonomy match → classify it into the catalogue (6.3) */}
      {showNoMatch &&
        (canCreateCustom ? (
          learnQuery ? (
            <LearnCreate query={learnQuery} onCancel={() => setLearnQuery(null)} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
              <p className="text-muted-foreground text-sm">
                Nothing in the catalogue matches “{trimmed}”.
              </p>
              <Button onClick={() => setLearnQuery(trimmed)}>
                <Sparkles className="size-4" />
                Learn “{trimmed}”
              </Button>
            </div>
          )
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            Nothing matches “{trimmed}”. Adding new topics needs an account.
          </p>
        ))}
    </div>
  );
}
