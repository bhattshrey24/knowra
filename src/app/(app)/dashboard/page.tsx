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
import { INITIAL_MASTERY, masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";
import { focusAreas, needsFoundationalWork, type FocusReason } from "@/lib/learning/focus";
import { aggregateByLevel, weakestConcepts } from "@/lib/learning/aggregate";
import { isUncertain } from "@/lib/learning/diagnostic";
import { subjectsOfConcept } from "@/lib/learning/taxonomy";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { quizHref } from "@/lib/taxonomy/catalogue";
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

interface ConceptMasteryRow extends MasteryState {
  concept_id: string;
}

async function loadData(): Promise<{
  mastery: MasteryRow[];
  attempts: AttemptLike[];
  conceptMastery: ConceptMasteryRow[];
  titles: Map<string, string>;
}> {
  const empty = { mastery: [], attempts: [], conceptMastery: [], titles: new Map() };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [masteryRes, attemptsRes, conceptRes, titles] = await Promise.all([
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
    supabase
      .from("concept_mastery")
      .select("concept_id,mastery,confidence,attempts,correct")
      .eq("user_id", user.id),
    customTitleMap(),
  ]);

  const attempts = (attemptsRes.data ?? []).map((a) => ({
    domainSlug: a.domain_slug as string,
    total: a.total as number,
    correct: a.correct as number,
    createdAt: a.created_at as string,
  }));

  return {
    mastery: (masteryRes.data as MasteryRow[] | null) ?? [],
    attempts,
    conceptMastery: (conceptRes.data as ConceptMasteryRow[] | null) ?? [],
    titles,
  };
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
  const { mastery, attempts, conceptMastery, titles } = await loadData();

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

  // Concept-level knowledge profile (Phase 6.2): aggregate concept evidence up
  // to topics, and surface the weakest concepts to revise.
  const byConcept = new Map<string, MasteryState>(
    conceptMastery.map((c) => [
      c.concept_id,
      { mastery: c.mastery, confidence: c.confidence, attempts: c.attempts, correct: c.correct },
    ]),
  );
  const tax = await getTaxonomy();
  const topicRollups = [...aggregateByLevel(byConcept, tax, "topic").entries()]
    .filter(([, s]) => s.conceptsAssessed > 0)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .slice(0, 6);
  const weakConceptIds = weakestConcepts(byConcept, 6);

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
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <CardTitle className="text-base">{name}</CardTitle>
                      {isUncertain(row) && <Badge variant="outline">Uncertain</Badge>}
                    </span>
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

      {weakConceptIds.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Weakest concepts</h2>
          <p className="text-muted-foreground text-sm">
            The specific ideas to shore up next — practise any one directly.
          </p>
          <div className="divide-y overflow-hidden rounded-xl border">
            {weakConceptIds.map((id) => {
              const concept = tax.conceptById.get(id);
              if (!concept) return null;
              const subjectId = subjectsOfConcept(tax, id)[0] ?? "";
              const topicName = tax.topicById.get(concept.topicIds[0])?.name;
              const subjectName = tax.subjectById.get(subjectId)?.name;
              const outOfTen = masteryOutOfTen(byConcept.get(id) ?? INITIAL_MASTERY);
              return (
                <Link
                  key={id}
                  href={quizHref({ level: "concept", id, subjectId })}
                  className="hover:bg-muted flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{concept.name}</span>
                      {isUncertain(byConcept.get(id)) && <Badge variant="outline">Uncertain</Badge>}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {[subjectName, topicName].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">
                    {outOfTen}
                    <span className="text-muted-foreground">/10</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {topicRollups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">By topic</h2>
          <p className="text-muted-foreground text-sm">
            Mastery rolled up from the concepts you&apos;ve been quizzed on.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {topicRollups.map(([topicId, s]) => {
              const topic = tax.topicById.get(topicId);
              if (!topic) return null;
              const subjectName = tax.subjectById.get(topic.subjectId)?.name;
              return (
                <Card key={topicId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{topic.name}</CardTitle>
                        <span className="text-muted-foreground text-xs">{subjectName}</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {Math.round(s.mastery * 10)}
                        <span className="text-muted-foreground">/10</span>
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={s.mastery * 100} aria-label={`${topic.name} mastery`} />
                    <div className="text-muted-foreground text-xs">
                      {s.conceptsAssessed} of {s.conceptsTotal} concepts assessed
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
