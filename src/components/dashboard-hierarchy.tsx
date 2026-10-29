"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { quizHref } from "@/lib/taxonomy/catalogue";
import type { MasteryDistribution } from "@/lib/learning/analytics";
import type { RollupStats } from "@/lib/learning/aggregate";

export interface ConceptItem {
  id: string;
  name: string;
  masteryOutOfTen: number;
  status: "mastered" | "learning" | "weak" | "unassessed";
  attempts: number;
  uncertain?: boolean;
}

export interface TopicItem {
  id: string;
  name: string;
  stats: RollupStats;
  concepts: ConceptItem[];
}

export interface SubjectHierarchyItem {
  id: string;
  slug: string;
  name: string;
  stats: RollupStats;
  distribution: MasteryDistribution;
  topics: TopicItem[];
}

const STATUS_CONFIG: Record<
  "mastered" | "learning" | "weak" | "unassessed",
  {
    label: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    colorClass: string;
  }
> = {
  mastered: {
    label: "Mastered",
    badgeVariant: "default",
    colorClass: "bg-emerald-600 dark:bg-emerald-500",
  },
  learning: {
    label: "Learning",
    badgeVariant: "secondary",
    colorClass: "bg-blue-600 dark:bg-blue-500",
  },
  weak: { label: "Weak", badgeVariant: "destructive", colorClass: "bg-rose-500 dark:bg-rose-600" },
  unassessed: {
    label: "Unassessed",
    badgeVariant: "outline",
    colorClass: "bg-muted-foreground/30",
  },
};

function DistributionBar({ distribution }: { distribution: MasteryDistribution }) {
  if (distribution.total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
        {distribution.masteredPct > 0 && (
          <div
            style={{ width: `${distribution.masteredPct * 100}%` }}
            className="bg-emerald-600 transition-all dark:bg-emerald-500"
            title={`${distribution.mastered} mastered (${Math.round(distribution.masteredPct * 100)}%)`}
          />
        )}
        {distribution.learningPct > 0 && (
          <div
            style={{ width: `${distribution.learningPct * 100}%` }}
            className="bg-blue-600 transition-all dark:bg-blue-500"
            title={`${distribution.learning} learning (${Math.round(distribution.learningPct * 100)}%)`}
          />
        )}
        {distribution.weakPct > 0 && (
          <div
            style={{ width: `${distribution.weakPct * 100}%` }}
            className="bg-rose-500 transition-all dark:bg-rose-600"
            title={`${distribution.weak} weak (${Math.round(distribution.weakPct * 100)}%)`}
          />
        )}
        {distribution.unassessedPct > 0 && (
          <div
            style={{ width: `${distribution.unassessedPct * 100}%` }}
            className="bg-muted-foreground/25 transition-all"
            title={`${distribution.unassessed} unassessed (${Math.round(distribution.unassessedPct * 100)}%)`}
          />
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
          {distribution.mastered} mastered
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-500" />
          {distribution.learning} learning
        </span>
        {distribution.weak > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500 dark:bg-rose-600" />
            {distribution.weak} weak
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="bg-muted-foreground/30 size-2 rounded-full" />
          {distribution.unassessed} unassessed
        </span>
      </div>
    </div>
  );
}

export function DashboardHierarchy({ subjects }: { subjects: SubjectHierarchyItem[] }) {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  function toggleSubject(id: string) {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleTopic(id: string) {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (subjects.length === 0) return null;

  return (
    <div className="space-y-4">
      {subjects.map((sub) => {
        const isExpanded = Boolean(expandedSubjects[sub.id]);
        const outOfTen = Math.round(sub.stats.mastery * 10);
        const coveragePct = Math.round(sub.stats.coverage * 100);

        return (
          <Card key={sub.id} className="overflow-hidden transition-colors">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSubject(sub.id)}
                      className="hover:text-primary inline-flex items-center gap-1.5 text-left text-base font-semibold transition-colors"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      )}
                      <span>{sub.name}</span>
                    </button>
                    {sub.stats.conceptsAssessed === 0 && (
                      <Badge variant="outline" className="text-[11px]">
                        Unassessed
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground pl-5 text-xs">
                    Explored {sub.stats.conceptsAssessed} of {sub.stats.conceptsTotal} concepts (
                    {coveragePct}%)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base font-semibold">{outOfTen}</span>
                    <span className="text-muted-foreground text-xs">/10</span>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href={`/quiz/${sub.slug}`} />}>
                    Practise
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Coverage and Mastery progress bar */}
              <div className="space-y-1">
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>Subject mastery</span>
                  <span>{Math.round(sub.stats.mastery * 100)}%</span>
                </div>
                <Progress value={sub.stats.mastery * 100} aria-label={`${sub.name} mastery`} />
              </div>

              {/* Phase 7.2 Mastery distribution */}
              <div className="space-y-1.5 pt-1">
                <span className="text-muted-foreground text-xs font-medium">Concept breakdown</span>
                <DistributionBar distribution={sub.distribution} />
              </div>

              {/* Phase 7.1 Drill-down topics & concepts */}
              {isExpanded && (
                <div className="bg-muted/20 mt-4 divide-y rounded-lg border pl-2">
                  {sub.topics.map((top) => {
                    const isTopExpanded = Boolean(expandedTopics[top.id]);
                    const topOutOfTen = Math.round(top.stats.mastery * 10);

                    return (
                      <div key={top.id} className="py-2.5 pr-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTopic(top.id)}
                            className="hover:text-primary flex items-center gap-1.5 text-left text-sm font-medium transition-colors"
                            aria-expanded={isTopExpanded}
                          >
                            {isTopExpanded ? (
                              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                            )}
                            <span>{top.name}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">
                              {top.stats.conceptsAssessed}/{top.stats.conceptsTotal} concepts
                            </span>
                            <span className="text-xs font-semibold tabular-nums">
                              {topOutOfTen}
                              <span className="text-muted-foreground">/10</span>
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              render={
                                <Link
                                  href={quizHref({
                                    level: "topic",
                                    id: top.id,
                                    subjectId: sub.slug,
                                  })}
                                />
                              }
                            >
                              Practise
                            </Button>
                          </div>
                        </div>

                        {isTopExpanded && (
                          <div className="mt-2 ml-5 space-y-1.5 border-l-2 pl-3">
                            {top.concepts.map((concept) => {
                              const config = STATUS_CONFIG[concept.status];
                              return (
                                <div
                                  key={concept.id}
                                  className="flex items-center justify-between gap-2 py-1 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground font-medium">
                                      {concept.name}
                                    </span>
                                    <Badge
                                      variant={config.badgeVariant}
                                      className="px-1.5 py-0 text-[10px]"
                                    >
                                      {config.label}
                                    </Badge>
                                    {concept.uncertain && (
                                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                        Uncertain
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold tabular-nums">
                                      {concept.masteryOutOfTen}
                                      <span className="text-muted-foreground">/10</span>
                                    </span>
                                    <Link
                                      href={quizHref({
                                        level: "concept",
                                        id: concept.id,
                                        subjectId: sub.slug,
                                      })}
                                      className="text-primary font-medium hover:underline"
                                    >
                                      Practise
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
