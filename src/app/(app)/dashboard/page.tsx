import Link from "next/link";
import { ArrowRight, BarChart3, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { AccuracyChart } from "@/components/accuracy-chart";
import { predefinedLearnable } from "@/lib/learnable";
import { createClient } from "@/lib/db/server";
import { customTitleMap } from "@/lib/db/learnable-server";
import { isSupabaseConfigured } from "@/lib/env";
import { masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";
import { focusAreas, needsFoundationalWork, type FocusReason } from "@/lib/learning/focus";
import {
  accuracyTimeline,
  domainGains,
  overallStats,
  type AttemptLike,
} from "@/lib/learning/analytics";

const FOCUS_LABEL: Record<FocusReason, string> = {
  weak: "Needs work",
  shaky: "Build confidence",
  practice: "Keep practising",
};

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface MasteryRow extends MasteryState {
  domain_slug: string;
}

async function loadData(): Promise<{
  mastery: MasteryRow[];
  attempts: AttemptLike[];
  titles: Map<string, string>;
}> {
  if (!isSupabaseConfigured()) return { mastery: [], attempts: [], titles: new Map() };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mastery: [], attempts: [], titles: new Map() };

  const [masteryRes, attemptsRes, titles] = await Promise.all([
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
    customTitleMap(),
  ]);

  const attempts = (attemptsRes.data ?? []).map((a) => ({
    domainSlug: a.domain_slug as string,
    total: a.total as number,
    correct: a.correct as number,
    createdAt: a.created_at as string,
  }));

  return { mastery: (masteryRes.data as MasteryRow[] | null) ?? [], attempts, titles };
}

function displayName(slug: string, titles: Map<string, string>): string {
  return predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
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
  const { mastery, attempts, titles } = await loadData();

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
  const focus = focusAreas(
    mastery.map((r) => ({
      slug: r.domain_slug,
      mastery: r.mastery,
      confidence: r.confidence,
      attempts: r.attempts,
    })),
  );

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

      {focus.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="text-primary size-4" />
              Focus areas
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Spend your next sessions here first — the highest-value ground to make up.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {focus.map((area) => (
              <div
                key={area.slug}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{displayName(area.slug, titles)}</span>
                  <Badge variant="secondary">{FOCUS_LABEL[area.reason]}</Badge>
                </div>
                <Button size="sm" variant="outline" render={<Link href={`/quiz/${area.slug}`} />}>
                  Practise
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
            const name = displayName(row.domain_slug, titles);
            const outOfTen = masteryOutOfTen(row);
            const accuracy = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0;
            const gain = gains.get(row.domain_slug);
            const gainPct = gain ? Math.round(gain.gain * 100) : 0;
            return (
              <Card key={row.domain_slug}>
                <CardHeader className="pb-3">
                  <div className="flex items-baseline justify-between">
                    <CardTitle className="text-base">{name}</CardTitle>
                    <span className="text-sm font-semibold">
                      {outOfTen}
                      <span className="text-muted-foreground">/10</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={row.mastery * 100} aria-label={`${name} mastery`} />
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
                  {needsFoundationalWork({
                    slug: row.domain_slug,
                    mastery: row.mastery,
                    confidence: row.confidence,
                    attempts: row.attempts,
                  }) && (
                    <p className="bg-accent text-accent-foreground rounded-md px-2 py-1.5 text-xs">
                      Shaky foundations here — try an easier quiz to shore up the basics first.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
