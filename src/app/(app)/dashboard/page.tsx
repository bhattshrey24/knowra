import Link from "next/link";
import { ArrowRight, BarChart3, Flame, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AccuracyChart } from "@/components/accuracy-chart";
import {
  DashboardHierarchy,
  type SubjectHierarchyItem,
  type TopicItem,
  type ConceptItem,
} from "@/components/dashboard-hierarchy";
import { DifficultyAccuracyChart } from "@/components/difficulty-accuracy-chart";
import { RetentionPanel } from "@/components/retention-panel";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { KnowledgeRadar } from "@/components/knowledge-radar";
import { AuthSyncBanner } from "@/components/auth-sync-banner";
import { predefinedLearnable } from "@/lib/learnable";
import { createClient } from "@/lib/db/server";
import { customTitleMap } from "@/lib/db/learnable-server";
import { isSupabaseConfigured } from "@/lib/env";
import { INITIAL_MASTERY, masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";
import { focusAreas, type FocusReason } from "@/lib/learning/focus";
import { aggregateByLevel, weakestConcepts } from "@/lib/learning/aggregate";
import { isUncertain } from "@/lib/learning/diagnostic";
import {
  conceptsForScope,
  conceptsOfTopic,
  subjectsOfConcept,
  topicsOfSubject,
} from "@/lib/learning/taxonomy";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { quizHref } from "@/lib/taxonomy/catalogue";
import {
  accuracyByDifficulty,
  accuracyTimeline,
  activityHeatmap,
  calculateStreak,
  conceptMasteryDistribution,
  overallStats,
  retentionStats,
  type AttemptWithDifficulty,
  type FlashcardRetentionLike,
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
  attempts: AttemptWithDifficulty[];
  conceptMastery: ConceptMasteryRow[];
  flashcards: FlashcardRetentionLike[];
  titles: Map<string, string>;
}> {
  const empty = {
    mastery: [],
    attempts: [],
    conceptMastery: [],
    flashcards: [],
    titles: new Map(),
  };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [masteryRes, attemptsRes, conceptRes, flashcardsRes, titles] = await Promise.all([
    supabase
      .from("domain_mastery")
      .select("domain_slug,mastery,confidence,attempts,correct")
      .eq("user_id", user.id)
      .order("mastery", { ascending: false }),
    supabase
      .from("quiz_attempts")
      .select("domain_slug,difficulty,total,correct,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("concept_mastery")
      .select("concept_id,mastery,confidence,attempts,correct")
      .eq("user_id", user.id),
    supabase
      .from("flashcards")
      .select("id,reps,ease,interval_days,due_at,last_reviewed_at")
      .eq("user_id", user.id),
    customTitleMap(),
  ]);

  const attempts: AttemptWithDifficulty[] = (attemptsRes.data ?? []).map((a) => ({
    domainSlug: a.domain_slug as string,
    difficulty: (a.difficulty as number) ?? undefined,
    total: a.total as number,
    correct: a.correct as number,
    createdAt: a.created_at as string,
  }));

  const flashcards: FlashcardRetentionLike[] = (flashcardsRes.data ?? []).map((f) => ({
    id: f.id as string,
    reps: (f.reps as number) ?? 0,
    ease: (f.ease as number) ?? 2.5,
    intervalDays: (f.interval_days as number) ?? 0,
    dueAt: (f.due_at as string) ?? new Date().toISOString(),
    lastReviewedAt: (f.last_reviewed_at as string | null) ?? null,
  }));

  return {
    mastery: (masteryRes.data as MasteryRow[] | null) ?? [],
    attempts,
    conceptMastery: (conceptRes.data as ConceptMasteryRow[] | null) ?? [],
    flashcards,
    titles,
  };
}

function displayName(slug: string, titles: Map<string, string>): string {
  return predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {Icon && <Icon className="text-muted-foreground size-5" />}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { mastery, attempts, conceptMastery, flashcards, titles } = await loadData();

  if (mastery.length === 0 && attempts.length === 0 && conceptMastery.length === 0) {
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

  const tax = await getTaxonomy();

  const byConcept = new Map<string, MasteryState>(
    conceptMastery.map((c) => [
      c.concept_id,
      { mastery: c.mastery, confidence: c.confidence, attempts: c.attempts, correct: c.correct },
    ]),
  );

  // Phase 7.1 & 7.2: Aggregate concept evidence up to subjects and topics
  const subjectRollups = aggregateByLevel(byConcept, tax, "subject");
  const topicRollups = aggregateByLevel(byConcept, tax, "topic");

  const hierarchySubjects: SubjectHierarchyItem[] = tax.subjects
    .map((sub) => {
      const stats = subjectRollups.get(sub.id) ?? {
        mastery: 0,
        attempts: 0,
        correct: 0,
        conceptsAssessed: 0,
        conceptsTotal: 0,
        coverage: 0,
      };

      const conceptIds = conceptsForScope(tax, "subject", sub.id);
      const distribution = conceptMasteryDistribution(conceptIds, byConcept);

      const topics: TopicItem[] = topicsOfSubject(tax, sub.id).map((top) => {
        const tStats = topicRollups.get(top.id) ?? {
          mastery: 0,
          attempts: 0,
          correct: 0,
          conceptsAssessed: 0,
          conceptsTotal: 0,
          coverage: 0,
        };

        const concepts: ConceptItem[] = conceptsOfTopic(tax, top.id).map((c) => {
          const state = byConcept.get(c.id);
          let status: "mastered" | "learning" | "weak" | "unassessed" = "unassessed";
          if (state && state.attempts > 0) {
            if (state.attempts < 2) status = "learning";
            else if (state.mastery >= 0.75) status = "mastered";
            else if (state.mastery < 0.5) status = "weak";
            else status = "learning";
          }

          return {
            id: c.id,
            name: c.name,
            masteryOutOfTen: masteryOutOfTen(state ?? INITIAL_MASTERY),
            status,
            attempts: state?.attempts ?? 0,
            uncertain: isUncertain(state),
          };
        });

        return {
          id: top.id,
          name: top.name,
          stats: tStats,
          concepts,
        };
      });

      return {
        id: sub.id,
        slug: sub.id,
        name: sub.name,
        stats,
        distribution,
        topics,
      };
    })
    .sort((a, b) => {
      // Engaged subjects first, then highest mastery
      if (a.stats.conceptsAssessed > 0 && b.stats.conceptsAssessed === 0) return -1;
      if (a.stats.conceptsAssessed === 0 && b.stats.conceptsAssessed > 0) return 1;
      return b.stats.mastery - a.stats.mastery || a.name.localeCompare(b.name);
    });

  const stats = overallStats(attempts);
  const timeline = accuracyTimeline(attempts);
  const diffAccuracy = accuracyByDifficulty(attempts);
  const streak = calculateStreak(attempts.map((a) => a.createdAt));
  const heatmap = activityHeatmap(
    attempts.map((a) => a.createdAt),
    28,
  );
  const retention = retentionStats(flashcards);

  const focus = focusAreas(
    hierarchySubjects
      .filter((s) => s.stats.conceptsAssessed > 0)
      .map((s) => ({
        slug: s.slug,
        mastery: s.stats.mastery,
        confidence: s.stats.coverage,
        attempts: s.stats.attempts,
      })),
  );

  const weakConceptIds = weakestConcepts(byConcept, 6);

  // Phase 7.6: Radar chart subjects
  const radarSubjects = hierarchySubjects
    .filter((s) => s.stats.conceptsAssessed > 0)
    .slice(0, 8)
    .map((s) => ({ name: s.name, mastery: s.stats.mastery }));

  // Phase 7.7: Subject filter options for accuracy trend
  const uniqueSlugs = Array.from(new Set(attempts.map((a) => a.domainSlug)));
  const subjectFilterOptions = uniqueSlugs.map((slug) => ({
    slug,
    name: displayName(slug, titles),
  }));

  return (
    <div className="space-y-8">
      <AuthSyncBanner />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your knowledge profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Concept-level mastery, difficulty calibration, learning momentum, and spaced retention.
        </p>
      </div>

      {/* Headline Stat Tiles with Streak */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Quizzes taken" value={String(stats.totalAttempts)} />
        <StatTile label="Questions answered" value={String(stats.totalAnswered)} />
        <StatTile label="Overall accuracy" value={`${Math.round(stats.accuracy * 100)}%`} />
        <StatTile
          label="Study streak"
          value={streak.currentStreak > 0 ? `${streak.currentStreak}d` : "0d"}
          icon={Flame}
        />
      </section>

      {/* Focus Areas (Lightweight 80/20) */}
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

      {/* Phase 7.4 & 7.5: Momentum Heatmap + Spaced Retention Panel */}
      <section className="grid gap-6 md:grid-cols-2">
        <ActivityHeatmap streak={streak} heatmap={heatmap} />
        <RetentionPanel stats={retention} />
      </section>

      {/* Phase 7.3 & 7.7: Accuracy by Difficulty & Accuracy Over Time */}
      <section className="grid gap-6 md:grid-cols-2">
        <DifficultyAccuracyChart data={diffAccuracy} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accuracy over time</CardTitle>
            <p className="text-muted-foreground text-xs">
              Trajectory of your quiz accuracy, filterable by subject.
            </p>
          </CardHeader>
          <CardContent>
            <AccuracyChart points={timeline} attempts={attempts} subjects={subjectFilterOptions} />
          </CardContent>
        </Card>
      </section>

      {/* Phase 7.6: Knowledge Map Radar */}
      {radarSubjects.length >= 3 && (
        <section>
          <KnowledgeRadar subjects={radarSubjects} />
        </section>
      )}

      {/* Phase 7.1 & 7.2: Subject Hierarchy Drill-down & Concept Breakdown */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Subjects & concept hierarchy</h2>
          <p className="text-muted-foreground text-sm">
            Derived directly from concept-level evidence. Tap any subject to drill down into its
            topics and individual concepts.
          </p>
        </div>

        <DashboardHierarchy subjects={hierarchySubjects} />
      </section>

      {/* Weakest Concepts List */}
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
    </div>
  );
}
