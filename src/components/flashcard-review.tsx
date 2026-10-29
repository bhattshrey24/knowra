"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ReviewGrade } from "@/lib/learning/sm2";

/** A card in a review session; `label` is the per-card context shown in the header. */
export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  label?: string;
}

const GRADES: { grade: ReviewGrade; label: string; sub: string; className: string }[] = [
  { grade: "again", label: "Again", sub: "Forgot", className: "text-destructive" },
  {
    grade: "hard",
    label: "Hard",
    sub: "Difficult",
    className: "text-amber-600 dark:text-amber-400",
  },
  {
    grade: "good",
    label: "Good",
    sub: "Recalled",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  {
    grade: "easy",
    label: "Easy",
    sub: "Effortless",
    className: "text-blue-600 dark:text-blue-400",
  },
];

/**
 * The flip-and-rate review flow used for studying any flashcard deck or the
 * due set: reveal the answer, then grade recall (SM-2 reschedules the card).
 */
export function FlashcardReview({
  title,
  cards,
  onExit,
}: {
  title: string;
  cards: ReviewCard[];
  onExit: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = cards.length;
  const card = cards[index];
  const done = index >= total;

  // Lock background scroll while the overlay is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      else if ((e.key === " " || e.key === "Enter") && !done) {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, done]);

  async function grade(g: ReviewGrade) {
    if (!card || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      });
    } catch {
      // best-effort: keep the session moving even without a backend
    }
    setSubmitting(false);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  const header = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="justify-self-start">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="size-4" />
          Exit review
        </Button>
      </div>
      <span className="truncate text-center text-sm font-medium">{card?.label ?? title}</span>
      <span aria-hidden />
    </div>
  );

  if (done) {
    return (
      <div
        className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-semibold">All caught up 🎉</p>
            <p className="text-muted-foreground text-sm">
              You reviewed {total} card{total === 1 ? "" : "s"}. They&apos;ll resurface when
              they&apos;re next due.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                router.refresh();
                onExit();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {header}

        <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs tabular-nums">
          <span>
            Card {index + 1} of {total}
          </span>
          <span>{total - index - 1} remaining</span>
        </div>
        <Progress value={((index + 1) / total) * 100} className="mt-2" />

        <div className="flex flex-1 items-center py-6">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? "Answer — tap to flip back" : "Question — tap to reveal answer"}
            className="relative block h-72 w-full select-none [perspective:1600px]"
          >
            <div
              className={cn(
                "preserve-3d relative size-full rounded-2xl transition-transform duration-500",
                flipped && "rotate-y-180",
              )}
            >
              <div className="bg-card absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center shadow-sm backface-hidden">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Question · tap to flip
                </span>
                <p className="text-xl font-semibold text-balance">{card.front}</p>
                <RotateCw className="text-muted-foreground size-5" />
              </div>
              <div className="bg-card absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center shadow-sm backface-hidden">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Answer · tap to flip
                </span>
                <p className="text-base text-balance">{card.back}</p>
                <RotateCw className="text-muted-foreground size-5" />
              </div>
            </div>
          </button>
        </div>

        {flipped ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium">How well did you remember?</p>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map(({ grade: g, label, sub, className }) => (
                <button
                  key={g}
                  type="button"
                  disabled={submitting}
                  onClick={() => grade(g)}
                  className="hover:border-primary/40 flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 transition-colors disabled:opacity-60"
                >
                  <span className={cn("text-sm font-semibold", className)}>{label}</span>
                  <span className="text-muted-foreground text-xs">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setFlipped(true)}>
            Reveal answer
          </Button>
        )}
      </div>
    </div>
  );
}
