"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/flashcards/decks";
import type { FlashcardType } from "@/types/learning";

const TYPE_BADGE: Record<
  FlashcardType,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  weakness: { label: "Review", variant: "destructive" },
  foundational: { label: "Foundational", variant: "secondary" },
  connection: { label: "Cross-domain", variant: "default" },
};

/** How far (px) a horizontal drag must travel to count as a swipe. */
const SWIPE_THRESHOLD = 50;

/**
 * Full-screen, Quizlet-style study view for one deck: tap/space to flip, swipe
 * or arrow keys / buttons to move between cards, Escape to close.
 */
export function FlashcardStudy({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Direction of the last move (1 = forward, -1 = back) for the slide-in animation.
  const [dir, setDir] = useState(1);

  const total = deck.cards.length;
  const card = deck.cards[index];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next < 0 || next >= total) return i;
        setFlipped(false);
        setDir(delta);
        return next;
      });
    },
    [total],
  );

  // Keyboard: ←/→ navigate, space/enter flip, Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock background scroll while the overlay is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Swipe handling via pointer events (works for touch and mouse). `moved`
  // distinguishes a swipe from a tap so a swipe doesn't also flip the card.
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    moved.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current !== null && Math.abs(e.clientX - startX.current) > 10) {
      moved.current = true;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx <= -SWIPE_THRESHOLD) go(1);
    else if (dx >= SWIPE_THRESHOLD) go(-1);
  }
  function onCardClick() {
    if (moved.current) {
      moved.current = false;
      return; // it was a swipe, not a tap
    }
    setFlipped((f) => !f);
  }

  const badge = TYPE_BADGE[card.type];

  return (
    <div
      className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={`Studying ${deck.name}`}
    >
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{deck.name}</h2>
            <p className="text-muted-foreground text-xs tabular-nums">
              Card {index + 1} of {total}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close study">
            <X className="size-5" />
          </Button>
        </div>

        <Progress value={((index + 1) / total) * 100} className="mt-4" />

        <div className="flex flex-1 items-center py-6">
          <div
            key={index}
            className={cn(
              "animate-in fade-in w-full duration-300",
              dir >= 0 ? "slide-in-from-right-6" : "slide-in-from-left-6",
            )}
          >
            <button
              type="button"
              onClick={onCardClick}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              aria-label={flipped ? "Answer — tap to flip back" : "Question — tap to reveal answer"}
              className="relative block h-72 w-full touch-pan-y select-none [perspective:1600px]"
            >
              <div
                className={cn(
                  "preserve-3d relative size-full rounded-2xl transition-transform duration-500",
                  flipped && "rotate-y-180",
                )}
              >
                <div className="bg-card absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center shadow-sm backface-hidden">
                  <span className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {card.conceptName && (
                      <span className="text-muted-foreground text-xs">{card.conceptName}</span>
                    )}
                  </span>
                  <p className="text-xl font-medium text-balance">{card.front}</p>
                  <span className="text-muted-foreground text-xs">Tap or press space to flip</span>
                </div>
                <div className="bg-accent text-accent-foreground absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center shadow-sm backface-hidden">
                  <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Answer
                  </span>
                  <p className="text-base text-balance">{card.back}</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous card"
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button variant="ghost" onClick={() => setFlipped((f) => !f)}>
            <RotateCw className="size-4" />
            Flip
          </Button>
          <Button
            variant="outline"
            onClick={() => go(1)}
            disabled={index === total - 1}
            aria-label="Next card"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-center text-xs">
          Swipe or use ← → to move between cards.
        </p>
      </div>
    </div>
  );
}
