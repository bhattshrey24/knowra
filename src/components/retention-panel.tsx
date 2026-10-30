import { ArrowRight, Clock } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RetentionSummary } from "@/lib/learning/analytics";

const DAY_LABELS = ["Today", "+1d", "+2d", "+3d", "+4d", "+5d", "+6d"];

export function RetentionPanel({ stats }: { stats: RetentionSummary }) {
  const maxDay = Math.max(1, ...stats.dueNext7Days);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="text-primary size-4" />
            Spaced repetition & retention
          </CardTitle>
          <ButtonLink size="sm" variant="outline" href="/flashcards">
            Review cards
            <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
        <p className="text-muted-foreground text-xs">
          How knowledge is persisting in memory through active-recall flashcards and SM-2
          scheduling.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold tracking-tight">{stats.dueNowCount}</div>
            <div className="text-muted-foreground mt-0.5 text-xs">Due right now</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold tracking-tight">
              {stats.reviewedCount > 0 ? `${Math.round(stats.retentionRate * 100)}%` : "—"}
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">Retention rate</div>
          </div>
          <div className="col-span-2 rounded-lg border p-3 sm:col-span-1">
            <div className="text-2xl font-semibold tracking-tight">{stats.reviewedCount}</div>
            <div className="text-muted-foreground mt-0.5 text-xs">Cards reviewed</div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">Next 7 days due forecast</span>
            <span>Total: {stats.dueNext7Days.reduce((a, b) => a + b, 0)} cards</span>
          </div>

          <div className="bg-muted/20 flex h-28 items-end justify-between gap-1.5 rounded-lg border p-3">
            {stats.dueNext7Days.map((count, index) => {
              const heightPct = Math.max(8, Math.round((count / maxDay) * 100));
              const isToday = index === 0;

              return (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-muted-foreground text-[10px] font-medium tabular-nums">
                    {count > 0 ? count : ""}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t transition-all ${
                      isToday
                        ? "bg-primary"
                        : count > 0
                          ? "bg-primary/60 dark:bg-primary/50"
                          : "bg-muted-foreground/20"
                    }`}
                    title={`${DAY_LABELS[index]}: ${count} card${count === 1 ? "" : "s"} due`}
                  />
                  <span
                    className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {DAY_LABELS[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
