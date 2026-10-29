"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlashcardStudy } from "@/components/flashcard-study";
import type { Deck } from "@/lib/flashcards/decks";

/** Grid of deck tiles; tapping one opens the full-screen study view. */
export function DeckBrowser({ decks }: { decks: Deck[] }) {
  const [active, setActive] = useState<Deck | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {decks.map((deck) => (
          <button
            key={deck.slug}
            type="button"
            onClick={() => setActive(deck)}
            aria-label={`Study ${deck.name} — ${deck.cards.length} cards`}
            className="hover:border-primary/40 focus-visible:border-primary flex flex-col gap-4 rounded-xl border p-5 text-left transition-colors outline-none"
          >
            <div className="flex items-center justify-between">
              <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                <Layers className="size-5" />
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {deck.cards.length} card{deck.cards.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">{deck.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {deck.dueCount > 0 && <Badge variant="destructive">{deck.dueCount} due</Badge>}
                {deck.counts.weakness > 0 && (
                  <Badge variant="outline">{deck.counts.weakness} weakness</Badge>
                )}
                {deck.counts.foundational > 0 && (
                  <Badge variant="outline">{deck.counts.foundational} foundational</Badge>
                )}
                {deck.counts.connection > 0 && (
                  <Badge variant="outline">{deck.counts.connection} connection</Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && <FlashcardStudy deck={active} onClose={() => setActive(null)} />}
    </>
  );
}
