import { Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityDay, StreakInfo } from "@/lib/learning/analytics";

const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-muted border border-border/40",
  1: "bg-emerald-200 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800",
  2: "bg-emerald-400 dark:bg-emerald-800 border border-emerald-500 dark:border-emerald-700",
  3: "bg-emerald-600 dark:bg-emerald-600 border border-emerald-700 dark:border-emerald-500",
  4: "bg-emerald-700 dark:bg-emerald-500 border border-emerald-800 dark:border-emerald-400",
};

export function ActivityHeatmap({
  streak,
  heatmap,
}: {
  streak: StreakInfo;
  heatmap: ActivityDay[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="size-4 text-amber-500" />
            Learning momentum
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
              <Flame className="size-3" />
              {streak.currentStreak} day streak
            </span>
            {streak.longestStreak > 0 && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Trophy className="size-3" />
                Best: {streak.longestStreak}d
              </span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Daily active sessions over the past 4 weeks. Consistency cements retention.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heatmap grid (4 weeks x 7 days) */}
        <div className="space-y-2">
          <div className="grid w-full grid-flow-col grid-rows-7 gap-1.5">
            {heatmap.map((day) => {
              const dateObj = new Date(day.date);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={day.date}
                  className={`size-4 cursor-pointer rounded-sm transition-transform hover:scale-110 sm:size-5 ${
                    LEVEL_CLASSES[day.level]
                  }`}
                  title={`${formattedDate}: ${day.count} activity session${day.count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>

          <div className="text-muted-foreground flex items-center justify-between pt-1 text-[11px]">
            <span>4 weeks ago</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span className="bg-muted border-border size-2.5 rounded-sm border" />
              <span className="size-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-950" />
              <span className="size-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-800" />
              <span className="size-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-600" />
              <span className="size-2.5 rounded-sm bg-emerald-700 dark:bg-emerald-500" />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
