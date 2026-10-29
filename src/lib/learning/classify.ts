/**
 * Deterministic resolution of an LLM-proposed `Subject → Topic → Concept`
 * classification against the existing taxonomy (Phase 6.3). The LLM only
 * *proposes* names; this decides what's reused vs. new, detects duplicates, and
 * mints collision-free slugs — so taxonomy integrity never depends on the model.
 */

import { topicsOfSubject, type Taxonomy } from "@/lib/learning/taxonomy";

export interface ProposedClassification {
  subject: string;
  topic: string;
  concept: string;
}

export interface ResolvedNode {
  id: string;
  name: string;
  /** True when this node doesn't exist yet and would be created on save. */
  isNew: boolean;
}

export interface ResolvedClassification {
  subject: ResolvedNode;
  topic: ResolvedNode;
  concept: ResolvedNode;
  /** The concept already exists under this topic — saving is a no-op reuse. */
  duplicate: boolean;
}

/** A clean, URL-safe kebab id from a display name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** A slug not already used as an id in `taken`, suffixed if needed. */
function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name) || "topic";
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function resolveClassification(
  proposal: ProposedClassification,
  tax: Taxonomy,
): ResolvedClassification {
  const subjectName = proposal.subject.trim();
  const topicName = proposal.topic.trim();
  const conceptName = proposal.concept.trim();

  const subjectMatch = tax.subjects.find((s) => normalize(s.name) === normalize(subjectName));
  const subject: ResolvedNode = subjectMatch
    ? { id: subjectMatch.id, name: subjectMatch.name, isNew: false }
    : {
        id: uniqueSlug(subjectName, new Set(tax.subjects.map((s) => s.id))),
        name: subjectName,
        isNew: true,
      };

  // Only match a topic within an existing subject.
  const topicMatch = subjectMatch
    ? topicsOfSubject(tax, subjectMatch.id).find((t) => normalize(t.name) === normalize(topicName))
    : undefined;
  const topic: ResolvedNode = topicMatch
    ? { id: topicMatch.id, name: topicMatch.name, isNew: false }
    : {
        id: uniqueSlug(topicName, new Set(tax.topics.map((t) => t.id))),
        name: topicName,
        isNew: true,
      };

  // Concepts are shared, so match by name globally (reuse across subjects).
  const conceptMatch = tax.concepts.find((c) => normalize(c.name) === normalize(conceptName));
  const concept: ResolvedNode = conceptMatch
    ? { id: conceptMatch.id, name: conceptMatch.name, isNew: false }
    : {
        id: uniqueSlug(conceptName, new Set(tax.concepts.map((c) => c.id))),
        name: conceptName,
        isNew: true,
      };

  const duplicate = Boolean(
    conceptMatch && topicMatch && conceptMatch.topicIds.includes(topicMatch.id),
  );

  return { subject, topic, concept, duplicate };
}
