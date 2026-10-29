"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quizHref, type Catalogue } from "@/lib/taxonomy/catalogue";
import { subjectIcon } from "@/lib/subject-icons";

type Tab = "subjects" | "topics" | "concepts";

const TABS: { id: Tab; label: string }[] = [
  { id: "subjects", label: "Subjects" },
  { id: "topics", label: "Topics" },
  { id: "concepts", label: "Concepts" },
];

/** How many cards each tab shows before "Browse all". */
const LIMIT: Record<Tab, number> = { subjects: 6, topics: 8, concepts: 10 };

/** A muted "A → B → C" hierarchy tag. */
function Breadcrumb({ parts }: { parts: string[] }) {
  return (
    <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3 opacity-60" />}
          {part}
        </span>
      ))}
    </span>
  );
}

/** A full-width list row (topics/concepts) with a hierarchy breadcrumb. */
function Row({ href, title, parts }: { href: string; title: string; parts: string[] }) {
  return (
    <Link
      href={href}
      className="hover:bg-muted flex items-center justify-between gap-3 px-4 py-3 transition-colors"
    >
      <span className="min-w-0 space-y-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <Breadcrumb parts={parts} />
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}

export function CatalogueTabs({ catalogue }: { catalogue: Catalogue }) {
  const [tab, setTab] = useState<Tab>("subjects");
  const [expanded, setExpanded] = useState(false);
  const { subjects, topics, concepts } = catalogue;

  function switchTab(next: Tab) {
    setTab(next);
    setExpanded(false);
  }

  const total =
    tab === "subjects" ? subjects.length : tab === "topics" ? topics.length : concepts.length;
  const limit = expanded ? total : LIMIT[tab];
  const hasMore = total > LIMIT[tab];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Explore the catalogue" className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => switchTab(id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "subjects" && (
        <div role="tabpanel" className="grid gap-3 sm:grid-cols-2">
          {subjects.slice(0, limit).map((s) => {
            const Icon = subjectIcon(s.id);
            return (
              <Link
                key={s.id}
                href={quizHref({ level: "subject", id: s.id, subjectId: s.id })}
                className="hover:border-primary/40 group flex flex-col gap-2 rounded-xl border p-4 transition-colors"
              >
                <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {s.description ?? `${s.topicCount} topics · ${s.conceptCount} concepts`}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "topics" && (
        <div role="tabpanel" className="divide-y overflow-hidden rounded-xl border">
          {topics.slice(0, limit).map((t) => (
            <Row
              key={t.id}
              href={quizHref({ level: "topic", id: t.id, subjectId: t.subjectId })}
              title={t.name}
              parts={[t.subjectName, t.name]}
            />
          ))}
        </div>
      )}

      {tab === "concepts" && (
        <div role="tabpanel" className="divide-y overflow-hidden rounded-xl border">
          {concepts.slice(0, limit).map((c) => (
            <Row
              key={c.id}
              href={quizHref({ level: "concept", id: c.id, subjectId: c.subjects[0]?.id ?? "" })}
              title={c.name}
              parts={[c.subjects[0]?.name, c.topics[0]?.name, c.name].filter(Boolean) as string[]}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : `Browse all ${total} ${tab}`}
        </Button>
      )}
    </div>
  );
}
