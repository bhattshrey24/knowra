"use client";

import { useState } from "react";

/** A tap-to-reveal revision card. */
export function Flashcard({ front, back, hint }: { front: string; back: string; hint?: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      aria-expanded={revealed}
      className="hover:border-primary/40 flex min-h-28 w-full flex-col rounded-lg border p-4 text-left transition-colors"
    >
      <span className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
        {revealed ? "Answer" : (hint ?? "Question — tap to reveal")}
      </span>
      <span className="text-sm">{revealed ? back : front}</span>
    </button>
  );
}
