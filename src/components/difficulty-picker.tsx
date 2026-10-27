"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/learning";

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Expert" },
];

export function DifficultyPicker({ domainName }: { domainName: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [started, setStarted] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Choose a difficulty</p>
        <p className="text-muted-foreground text-sm">
          Start wherever you like. As Knowra learns your level, it will recommend one — you always
          get the final say.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map(({ value, label }) => {
          const active = difficulty === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setDifficulty(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:border-primary/40",
              )}
            >
              <span className="text-lg font-semibold">{value}</span>
              <span className="text-muted-foreground text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>

      {started ? (
        <div className="text-muted-foreground flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm">
          <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
          <p>
            AI quiz generation for <span className="text-foreground font-medium">{domainName}</span>{" "}
            at difficulty {difficulty} is wired up in Phase 1, once the provider-agnostic LLM layer
            is connected. The screen, scoring, and difficulty selection are ready.
          </p>
        </div>
      ) : (
        <Button size="lg" onClick={() => setStarted(true)}>
          Start quiz
        </Button>
      )}
    </div>
  );
}
