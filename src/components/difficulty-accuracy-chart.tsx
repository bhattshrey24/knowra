import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DifficultyAccuracy } from "@/lib/learning/analytics";

const LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

export function DifficultyAccuracyChart({ data }: { data: DifficultyAccuracy[] }) {
  const hasData = data.some((d) => d.attempts > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Accuracy by difficulty</CardTitle>
        <p className="text-muted-foreground text-xs">
          Compares your accuracy across difficulty levels 1–5 — separating question difficulty from
          your concept mastery.
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Complete quizzes at varied difficulties to see your performance breakdown here.
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((d) => {
              const pct = Math.round(d.accuracy * 100);
              return (
                <div key={d.difficulty} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">
                      Level {d.difficulty} · {LABELS[d.difficulty]}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {d.attempts > 0 ? (
                        <>
                          <strong className="text-foreground">{pct}%</strong> ({d.correctQuestions}/
                          {d.totalQuestions} correct)
                        </>
                      ) : (
                        "No attempts yet"
                      )}
                    </span>
                  </div>
                  <Progress value={pct} aria-label={`Level ${d.difficulty} accuracy`} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
