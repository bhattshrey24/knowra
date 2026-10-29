/**
 * Presentation-ready views of the taxonomy for the homepage (catalogue tabs +
 * search). Pure and deterministic: given a built `Taxonomy`, it produces the
 * cards (with parent context) and a flat, rankable search index. The UI never
 * re-derives relationships — it renders what this returns.
 */

import type { TaxonomyLevel } from "@/types/learning";
import {
  conceptsForScope,
  conceptsOfTopic,
  subjectsOfConcept,
  topicsOfSubject,
  type Taxonomy,
} from "@/lib/learning/taxonomy";

export interface SubjectCard {
  id: string;
  name: string;
  description?: string;
  topicCount: number;
  conceptCount: number;
}

export interface TopicCard {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  conceptCount: number;
}

export interface ConceptCard {
  id: string;
  name: string;
  topics: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}

/** One searchable node, with the subject it routes to and a parent label. */
export interface SearchItem {
  level: TaxonomyLevel;
  id: string;
  name: string;
  /** Subject the quiz route uses (the node's own id, or a parent subject). */
  subjectId: string;
  /** Human context shown under the name, e.g. "Algebra · Mathematics". */
  parentLabel?: string;
}

export interface Catalogue {
  subjects: SubjectCard[];
  topics: TopicCard[];
  concepts: ConceptCard[];
  searchItems: SearchItem[];
}

export function buildCatalogue(tax: Taxonomy): Catalogue {
  const subjects: SubjectCard[] = tax.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    topicCount: topicsOfSubject(tax, s.id).length,
    conceptCount: conceptsForScope(tax, "subject", s.id).length,
  }));

  const topics: TopicCard[] = tax.topics.map((t) => ({
    id: t.id,
    name: t.name,
    subjectId: t.subjectId,
    subjectName: tax.subjectById.get(t.subjectId)?.name ?? t.subjectId,
    conceptCount: conceptsOfTopic(tax, t.id).length,
  }));

  const concepts: ConceptCard[] = tax.concepts.map((c) => ({
    id: c.id,
    name: c.name,
    topics: c.topicIds.map((id) => ({ id, name: tax.topicById.get(id)?.name ?? id })),
    subjects: subjectsOfConcept(tax, c.id).map((id) => ({
      id,
      name: tax.subjectById.get(id)?.name ?? id,
    })),
  }));

  const searchItems: SearchItem[] = [
    ...subjects.map((s) => ({
      level: "subject" as const,
      id: s.id,
      name: s.name,
      subjectId: s.id,
    })),
    ...topics.map((t) => ({
      level: "topic" as const,
      id: t.id,
      name: t.name,
      subjectId: t.subjectId,
      parentLabel: t.subjectName,
    })),
    ...concepts.map((c) => ({
      level: "concept" as const,
      id: c.id,
      name: c.name,
      subjectId: c.subjects[0]?.id ?? "",
      parentLabel: [c.topics[0]?.name, c.subjects[0]?.name].filter(Boolean).join(" · "),
    })),
  ];

  return { subjects, topics, concepts, searchItems };
}

/** The quiz URL for a taxonomy node — a subject quiz, optionally scoped. */
export function quizHref(node: { level: TaxonomyLevel; id: string; subjectId: string }): string {
  if (node.level === "subject") return `/quiz/${node.subjectId}`;
  const key = node.level === "topic" ? "topic" : "concept";
  return `/quiz/${node.subjectId}?${key}=${node.id}`;
}

const LEVEL_RANK: Record<TaxonomyLevel, number> = { subject: 0, topic: 1, concept: 2 };

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Lower is better; 99 means "no match". */
function matchScore(name: string, query: string): number {
  const n = normalize(name);
  if (n === query) return 0;
  if (n.startsWith(query)) return 1;
  if (n.split(" ").some((word) => word.startsWith(query))) return 2;
  if (n.includes(query)) return 3;
  return 99;
}

/**
 * Closest-matching nodes for a query, best first: exact > prefix > word-prefix
 * > substring, then subjects before topics before concepts, then name. Returns
 * at most `limit` items; empty for a blank query.
 */
export function rankSearchItems(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const q = normalize(query);
  if (!q) return [];
  return items
    .map((item) => ({ item, score: matchScore(item.name, q) }))
    .filter((s) => s.score < 99)
    .sort(
      (a, b) =>
        a.score - b.score ||
        LEVEL_RANK[a.item.level] - LEVEL_RANK[b.item.level] ||
        a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
    .map((s) => s.item);
}
