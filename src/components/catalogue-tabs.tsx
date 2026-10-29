"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { quizHref, type Catalogue } from "@/lib/taxonomy/catalogue";

type Tab = "subjects" | "topics" | "concepts";

const TABS: { id: Tab; label: string }[] = [
  { id: "subjects", label: "Subjects" },
  { id: "topics", label: "Topics" },
  { id: "concepts", label: "Concepts" },
];

function NodeCard({
  href,
  title,
  meta,
  caption,
}: {
  href: string;
  title: string;
  meta?: string;
  caption?: string;
}) {
  return (
    <Link href={href} className="group focus:outline-none">
      <Card className="group-hover:border-primary/40 group-focus-visible:border-primary h-full transition-colors">
        <CardHeader className="pb-2">
          {meta && (
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {meta}
            </span>
          )}
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        {caption && <CardContent className="text-muted-foreground text-sm">{caption}</CardContent>}
      </Card>
    </Link>
  );
}

export function CatalogueTabs({ catalogue }: { catalogue: Catalogue }) {
  const [tab, setTab] = useState<Tab>("subjects");
  const { subjects, topics, concepts } = catalogue;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Explore the catalogue"
        className="bg-muted inline-flex rounded-lg p-1"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "subjects" && (
        <div role="tabpanel" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <NodeCard
              key={s.id}
              href={quizHref({ level: "subject", id: s.id, subjectId: s.id })}
              title={s.name}
              caption={s.description ?? `${s.topicCount} topics · ${s.conceptCount} concepts`}
            />
          ))}
        </div>
      )}

      {tab === "topics" && (
        <div role="tabpanel" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <NodeCard
              key={t.id}
              href={quizHref({ level: "topic", id: t.id, subjectId: t.subjectId })}
              title={t.name}
              meta={t.subjectName}
              caption={`${t.conceptCount} concept${t.conceptCount === 1 ? "" : "s"}`}
            />
          ))}
        </div>
      )}

      {tab === "concepts" && (
        <div role="tabpanel" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((c) => (
            <NodeCard
              key={c.id}
              href={quizHref({ level: "concept", id: c.id, subjectId: c.subjects[0]?.id ?? "" })}
              title={c.name}
              meta={[c.topics[0]?.name, c.subjects[0]?.name].filter(Boolean).join(" · ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
