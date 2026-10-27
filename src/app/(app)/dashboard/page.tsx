import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { AccuracyChart } from "@/components/accuracy-chart";
import { DOMAINS } from "@/lib/domains";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";
import {
  accuracyTimeline,
  domainGains,
  overallStats,
  type AttemptLike,
} from "@/lib/learning/analytics";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface MasteryRow extends MasteryState {
  domain_slug: string;
}

async function loadData(): Promise<{ mastery: MasteryRow[]; attempts: AttemptLike[] }> {
  if (!isSupabaseConfigured()) return { mastery: [], attempts: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mastery: [], attempts: [] };

  const [masteryRes, attemptsRes] = await Promise.all([
    supabase
      .from("domain_mastery")
      .select("domain_slug,mastery,confidence,attempts,correct")
      .eq("user_id", user.id)
      .order("mastery", { ascending: false }),
    supabase
      .from("quiz_attempts")
      .select("domain_slug,total,correct,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const attempts = (attemptsRes.data ?? []).map((a) => ({
    domainSlug: a.domain_slug as string,
    total: a.total as number,
    correct: a.correct as number,
    createdAt: a.created_at as string,
  }));

  return { mastery: (masteryRes.data as MasteryRow[] | null) ?? [], attempts };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground mt-1 text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { mastery, attempts } = await loadData();

  if (mastery.length === 0 && attempts.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your progress</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Accuracy, estimated mastery, and learning gains — across every subject.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No activity yet"
          description="Take your first quiz and your knowledge profile, mastery estimates, and trends will appear here."
        >
          <Button render={<Link href="/home" />}>Start a quiz</Button>
        </EmptyState>
      </div>
    );
  }

  const stats = overallStats(attempts);
  const timeline = accuracyTimeline(attempts);
  const gains = new Map(domainGains(attempts).map((g) => [g.domainSlug, g]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your knowledge profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          How much you know, and how it&apos;s changing over time.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Quizzes taken" value={String(stats.totalAttempts)} />
        <StatTile label="Questions answered" value={String(stats.totalAnswered)} />
        <StatTile label="Overall accuracy" value={`${Math.round(stats.accuracy * 100)}%`} />
      </section>

      {timeline.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accuracy over time</CardTitle>
          </CardHeader>
          <CardContent>
            <AccuracyChart points={timeline} />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">By subject</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mastery.map((row) => {
            const domain = DOMAINS.find((d) => d.slug === row.domain_slug);
            const outOfTen = masteryOutOfTen(row);
            const accuracy = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0;
            const gain = gains.get(row.domain_slug);
            const gainPct = gain ? Math.round(gain.gain * 100) : 0;
            return (
              <Card key={row.domain_slug}>
                <CardHeader className="pb-3">
                  <div className="flex items-baseline justify-between">
                    <CardTitle className="text-base">{domain?.name ?? row.domain_slug}</CardTitle>
                    <span className="text-sm font-semibold">
                      {outOfTen}
                      <span className="text-muted-foreground">/10</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={row.mastery * 100} aria-label={`${domain?.name} mastery`} />
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {row.attempts} answered · {accuracy}% correct
                    </span>
                    {gain && gain.attempts >= 2 && gainPct !== 0 && (
                      <span
                        className={
                          gainPct > 0
                            ? "inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                            : "text-destructive inline-flex items-center gap-1"
                        }
                      >
                        {gainPct > 0 ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {gainPct > 0 ? "+" : ""}
                        {gainPct}% since baseline
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
