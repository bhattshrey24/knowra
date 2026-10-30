"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResolvedClassification } from "@/lib/learning/classify";

/**
 * Search-create flow (Phase 6.3): asks the server to classify a free-text
 * request into Subject → Topic → Concept, lets the learner correct it, then
 * saves it to the taxonomy and starts a quiz on the concept.
 */
export function LearnCreate({ query, onCancel }: { query: string; onCancel: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cls, setCls] = useState<ResolvedClassification | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [concept, setConcept] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) {
          // 503 = the LLM is down; there's no curated fallback for brand-new
          // content, so surface the server's "try again later" message.
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(
            res.status === 503 && body?.error
              ? body.error
              : "Couldn't suggest a classification. Try again.",
          );
        }
        const data = (await res.json()) as { classification: ResolvedClassification };
        if (!active) return;
        setCls(data.classification);
        setSubject(data.classification.subject.name);
        setTopic(data.classification.topic.name);
        setConcept(data.classification.concept.name);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : "Couldn't suggest a classification. Try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  async function start() {
    if (saving || !subject.trim() || !topic.trim() || !concept.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, topic, concept }),
      });
      if (!res.ok) throw new Error();
      const { subjectId, conceptId } = (await res.json()) as {
        subjectId: string;
        conceptId: string;
      };
      router.push(`/quiz/${subjectId}?concept=${conceptId}`);
    } catch {
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      {loading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Figuring out where “{query}” fits…
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium">Here&apos;s where this fits</p>
            <p className="text-muted-foreground text-xs">
              Edit anything that looks off, then start learning. New items are added to your
              catalogue.
            </p>
          </div>

          <div className="space-y-3">
            <Field
              label="Subject"
              value={subject}
              onChange={setSubject}
              isNew={cls?.subject.isNew}
            />
            <Field label="Topic" value={topic} onChange={setTopic} isNew={cls?.topic.isNew} />
            <Field
              label="Concept"
              value={concept}
              onChange={setConcept}
              isNew={cls?.concept.isNew}
            />
          </div>

          {cls?.duplicate && (
            <p className="text-muted-foreground text-xs">
              You already have this concept — this will just open it.
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={start} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Start learning
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  isNew,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isNew?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        {isNew !== undefined && (
          <Badge variant={isNew ? "default" : "outline"}>{isNew ? "New" : "Existing"}</Badge>
        )}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background focus-visible:border-primary focus-visible:ring-ring/40 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
      />
    </label>
  );
}
