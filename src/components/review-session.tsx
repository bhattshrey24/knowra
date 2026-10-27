"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ReviewGrade } from "@/lib/learning/sm2";

export interface DueCard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

const GRADES: { grade: ReviewGrade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
];

export function ReviewSession({ cards }: { cards: DueCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const card = cards[index];

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
      // best-effort; keep the session moving
    }
    setSubmitting(false);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (index >= cards.length) {
    return (
      <div className="space-y-3 rounded-lg border p-6 text-center">
        <p className="text-sm font-medium">All caught up 🎉</p>
        <p className="text-muted-foreground text-sm">
          You reviewed {cards.length} card{cards.length === 1 ? "" : "s"}. They&apos;ll resurface
          when they&apos;re next due.
        </p>
        <Button variant="outline" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-5">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          Reviewing {index + 1} / {cards.length}
        </span>
        {card.hint ? <span>{card.hint}</span> : null}
      </div>

      <p className="text-base font-medium">{card.front}</p>

      {revealed ? (
        <>
          <p className="text-muted-foreground border-t pt-3 text-sm">{card.back}</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ grade: g, label }) => (
              <Button
                key={g}
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => grade(g)}
              >
                {label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      )}
    </div>
  );
}
