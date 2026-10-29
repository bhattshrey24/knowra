"use client";

import { useState } from "react";
import { ArrowRight, CalendarCheck, ChevronRight, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subjectIcon } from "@/lib/subject-icons";
import { FlashcardReview, type ReviewCard } from "@/components/flashcard-review";
import type { FlashcardCatalogue, FlashGroup, FlashLevel } from "@/lib/flashcards/catalogue";

interface Session {
  title: string;
  cards: ReviewCard[];
}

type Filter = "all" | "due";

const TABS: { id: FlashLevel; label: string }[] = [
  { id: "subjects", label: "Subjects" },
  { id: "topics", label: "Topics" },
  { id: "concepts", label: "Concepts" },
];

const LIMIT = 6;

function groupMeta(g: FlashGroup): string {
  return [
    g.parentLabel,
    `${g.total} card${g.total === 1 ? "" : "s"}`,
    g.due > 0 ? `${g.due} due` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function FlashcardsBrowser({
  catalogue,
  dueCards,
}: {
  catalogue: FlashcardCatalogue;
  dueCards: ReviewCard[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<FlashLevel>("subjects");
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  function switchTab(next: FlashLevel) {
    setTab(next);
    setExpanded(false);
  }

  const all = catalogue[tab];
  const groups = filter === "due" ? all.filter((g) => g.due > 0) : all;
  const shown = expanded ? groups : groups.slice(0, LIMIT);

  function openGroup(g: FlashGroup) {
    const source = filter === "due" ? g.cards.filter((c) => c.due) : g.cards;
    setSession({
      title: g.name,
      cards: source.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        label: c.conceptName ?? g.name,
      })),
    });
  }

  return (
    <div className="space-y-8">
      {dueCards.length > 0 && (
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CalendarCheck className="text-primary mt-0.5 size-5" />
              <div>
                <h2 className="font-semibold">Due for review</h2>
                <p className="text-muted-foreground text-sm">
                  Flashcards scheduled for review today
                </p>
              </div>
            </div>
            <span className="text-2xl font-semibold tabular-nums">{dueCards.length}</span>
          </div>
          <Button
            className="w-full"
            onClick={() => setSession({ title: "Due for review", cards: dueCards })}
          >
            Review all due cards
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Your flashcards</h2>
        <div className="grid grid-cols-2 gap-3">
          <FilterCard
            icon={Layers}
            title="All cards"
            caption="Browse everything"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterCard
            icon={Clock}
            title="Due cards"
            caption="Review scheduled"
            active={filter === "due"}
            onClick={() => setFilter("due")}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Browse by learning area</h2>
        <div role="tablist" aria-label="Browse flashcards" className="grid grid-cols-3 gap-2">
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => switchTab(id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {filter === "due" ? "Nothing due in this view." : "No cards here yet."}
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border">
            {shown.map((g) => {
              const Icon = tab === "subjects" ? subjectIcon(g.subjectId) : null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openGroup(g)}
                  className="hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  {Icon && (
                    <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{g.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {groupMeta(g)}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {groups.length > LIMIT && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : `Browse ${filter === "due" ? "due" : "all"} ${tab}`}
          </Button>
        )}
      </div>

      {session && (
        <FlashcardReview
          title={session.title}
          cards={session.cards}
          onExit={() => setSession(null)}
        />
      )}
    </div>
  );
}

function FilterCard({
  icon: Icon,
  title,
  caption,
  active,
  onClick,
}: {
  icon: typeof Layers;
  title: string;
  caption: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border p-5 text-center transition-colors",
        active ? "border-primary bg-accent text-accent-foreground" : "hover:border-primary/40",
      )}
    >
      <Icon className={cn("size-5", active ? "" : "text-muted-foreground")} />
      <span className="mt-1 text-sm font-medium">{title}</span>
      <span className="text-muted-foreground text-xs">{caption}</span>
    </button>
  );
}
