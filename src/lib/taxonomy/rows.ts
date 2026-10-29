/**
 * Pure mapping between the taxonomy model and its database row shapes
 * (migration `0007`). Kept separate from the I/O in `db/taxonomy-server.ts` so
 * the mapping is deterministic and unit-tested (round-trip), with no Supabase
 * dependency.
 */

import type { Concept, Subject, Topic } from "@/types/learning";
import type { TaxonomyInput } from "@/lib/learning/taxonomy";

export interface SubjectRow {
  id: string;
  name: string;
  description: string | null;
}
export interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
}
export interface ConceptRow {
  id: string;
  name: string;
  foundational_weight: number | null;
}
export interface ConceptTopicRow {
  concept_id: string;
  topic_id: string;
}

export interface TaxonomyRows {
  subjects: SubjectRow[];
  topics: TopicRow[];
  concepts: ConceptRow[];
  conceptTopics: ConceptTopicRow[];
}

/** Flatten the taxonomy into rows ready to upsert into the shared tables. */
export function taxonomyToRows(input: TaxonomyInput): TaxonomyRows {
  return {
    subjects: input.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
    })),
    topics: input.topics.map((t) => ({ id: t.id, subject_id: t.subjectId, name: t.name })),
    concepts: input.concepts.map((c) => ({
      id: c.id,
      name: c.name,
      foundational_weight: c.foundationalWeight ?? null,
    })),
    conceptTopics: input.concepts.flatMap((c) =>
      c.topicIds.map((topicId) => ({ concept_id: c.id, topic_id: topicId })),
    ),
  };
}

/** Rebuild the taxonomy model from database rows (inverse of taxonomyToRows). */
export function rowsToTaxonomy(rows: TaxonomyRows): TaxonomyInput {
  const subjects: Subject[] = rows.subjects.map((r) => ({
    id: r.id,
    name: r.name,
    ...(r.description != null ? { description: r.description } : {}),
  }));

  const topics: Topic[] = rows.topics.map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    name: r.name,
  }));

  // Group topic ids per concept, preserving row order.
  const topicIdsByConcept = new Map<string, string[]>();
  for (const link of rows.conceptTopics) {
    const list = topicIdsByConcept.get(link.concept_id) ?? [];
    list.push(link.topic_id);
    topicIdsByConcept.set(link.concept_id, list);
  }

  const concepts: Concept[] = rows.concepts.map((r) => ({
    id: r.id,
    name: r.name,
    topicIds: topicIdsByConcept.get(r.id) ?? [],
    ...(r.foundational_weight != null ? { foundationalWeight: r.foundational_weight } : {}),
  }));

  return { subjects, topics, concepts };
}
