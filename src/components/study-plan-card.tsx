"use client";

import { useEffect, useState } from "react";
import { Sparkles, GraduationCap, Dumbbell, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { StudyAction, StudyPlan } from "@/types/learning";

/**
 * AI study-plan advisor. Shows the learner what to focus on next in a subject.
 * The plan's *facts* come from the deterministic engine; the LLM only phrases
 * them. Degrades gracefully: on any failure it renders nothing (the quiz below
 * still works), and when the plan is deterministic it says so.
 */
export function StudyPlanCard({
  subjectSlug,
  subjectName,
}: {
  subjectSlug: string;
  subjectName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [aiGenerated, setAiGenerated] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/study-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subject: subjectSlug }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { plan: StudyPlan; aiGenerated: boolean };
        if (!active) return;
        setPlan(data.plan);
        setAiGenerated(data.aiGenerated);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [subjectSlug]);

  if (failed) return null;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4" />
        <h2 className="text-sm font-medium">Your plan for {subjectName}</h2>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your study plan">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : plan ? (
        <>
          <p className="text-muted-foreground text-sm">{plan.overview}</p>
          {plan.steps.length > 0 && (
            <ul className="space-y-2">
              {plan.steps.map((step) => (
                <li key={step.conceptId} className="bg-accent/40 flex gap-3 rounded-lg p-3">
                  <ActionIcon action={step.action} />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{step.conceptName}</span>
                      <Badge variant="outline" className="capitalize">
                        {step.action}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{step.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {plan.encouragement && (
            <p className="text-muted-foreground text-xs italic">{plan.encouragement}</p>
          )}
          {!aiGenerated && (
            <p className="text-muted-foreground text-xs">
              Generated from your progress (AI coaching unavailable right now).
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function ActionIcon({ action }: { action: StudyAction }) {
  const cls = "text-muted-foreground mt-0.5 size-4 shrink-0";
  if (action === "learn") return <GraduationCap className={cls} aria-hidden />;
  if (action === "strengthen") return <Dumbbell className={cls} aria-hidden />;
  return <RotateCcw className={cls} aria-hidden />;
}
