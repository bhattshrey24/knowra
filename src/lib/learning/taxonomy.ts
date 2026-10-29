/**
 * The deterministic Subject → Topic → Concept taxonomy engine (Phase 6.1).
 *
 * Per the golden rules, taxonomy structure and the mapping from a quiz scope to
 * its concepts live here as LLM-independent, unit-tested TypeScript. The LLM may
 * *propose* new nodes (Phase 6.3), but this module is what validates the
 * relationships and resolves them — never the model.
 *
 * Concepts are shared, not duplicated: a concept can belong to several topics
 * (and so span subjects), so scope resolution works with sets of concept ids.
 */

import type { Concept, Subject, TaxonomyLevel, Topic } from "@/types/learning";

export interface TaxonomyInput {
  subjects: Subject[];
  topics: Topic[];
  concepts: Concept[];
}

/** An indexed, validated taxonomy ready for lookups. */
export interface Taxonomy extends TaxonomyInput {
  subjectById: Map<string, Subject>;
  topicById: Map<string, Topic>;
  conceptById: Map<string, Concept>;
}

export interface TaxonomyIssue {
  level: TaxonomyLevel;
  id: string;
  message: string;
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

/**
 * Check structural integrity: ids unique within a level, every parent
 * reference resolvable, and no concept without a topic. Returns all issues
 * found (empty = sound) so callers can report them rather than throw.
 */
export function validateTaxonomy(input: TaxonomyInput): TaxonomyIssue[] {
  const issues: TaxonomyIssue[] = [];

  const subjectIds = new Set<string>();
  for (const subject of input.subjects) {
    if (subjectIds.has(subject.id)) {
      issues.push({ level: "subject", id: subject.id, message: "duplicate subject id" });
    }
    subjectIds.add(subject.id);
  }

  const topicIds = new Set<string>();
  for (const topic of input.topics) {
    if (topicIds.has(topic.id)) {
      issues.push({ level: "topic", id: topic.id, message: "duplicate topic id" });
    }
    topicIds.add(topic.id);
    if (!subjectIds.has(topic.subjectId)) {
      issues.push({
        level: "topic",
        id: topic.id,
        message: `references unknown subject "${topic.subjectId}"`,
      });
    }
  }

  const conceptIds = new Set<string>();
  for (const concept of input.concepts) {
    if (conceptIds.has(concept.id)) {
      issues.push({ level: "concept", id: concept.id, message: "duplicate concept id" });
    }
    conceptIds.add(concept.id);
    if (concept.topicIds.length === 0) {
      issues.push({ level: "concept", id: concept.id, message: "concept has no topics" });
    }
    for (const topicId of concept.topicIds) {
      if (!topicIds.has(topicId)) {
        issues.push({
          level: "concept",
          id: concept.id,
          message: `references unknown topic "${topicId}"`,
        });
      }
    }
    for (const prereq of concept.prerequisiteIds ?? []) {
      if (prereq === concept.id) {
        issues.push({
          level: "concept",
          id: concept.id,
          message: "concept is its own prerequisite",
        });
      }
    }
  }

  return issues;
}

/** Build an indexed taxonomy. Throws if the input is structurally invalid. */
export function buildTaxonomy(input: TaxonomyInput): Taxonomy {
  const issues = validateTaxonomy(input);
  if (issues.length > 0) {
    const summary = issues.map((i) => `${i.level} ${i.id}: ${i.message}`).join("; ");
    throw new Error(`Invalid taxonomy: ${summary}`);
  }
  return {
    ...input,
    subjectById: new Map(input.subjects.map((s) => [s.id, s])),
    topicById: new Map(input.topics.map((t) => [t.id, t])),
    conceptById: new Map(input.concepts.map((c) => [c.id, c])),
  };
}

/** Topics belonging to a subject. */
export function topicsOfSubject(tax: Taxonomy, subjectId: string): Topic[] {
  return tax.topics.filter((t) => t.subjectId === subjectId);
}

/** Concepts linked to a topic. */
export function conceptsOfTopic(tax: Taxonomy, topicId: string): Concept[] {
  return tax.concepts.filter((c) => c.topicIds.includes(topicId));
}

/** The subjects a concept ultimately belongs to, via its topics (deduped). */
export function subjectsOfConcept(tax: Taxonomy, conceptId: string): string[] {
  const concept = tax.conceptById.get(conceptId);
  if (!concept) return [];
  const subjectIds = concept.topicIds
    .map((topicId) => tax.topicById.get(topicId)?.subjectId)
    .filter((id): id is string => Boolean(id));
  return uniqueSorted(subjectIds);
}

/**
 * The concept ids a quiz scoped to (level, id) should draw from — the heart of
 * "quiz at any level, track at the concept level" (Phase 6.2):
 *  - concept: just that concept
 *  - topic:   every concept linked to the topic
 *  - subject: every concept under any of the subject's topics
 * Returns a sorted, de-duplicated list; empty if the id is unknown.
 */
export function conceptsForScope(tax: Taxonomy, level: TaxonomyLevel, id: string): string[] {
  if (level === "concept") {
    return tax.conceptById.has(id) ? [id] : [];
  }
  if (level === "topic") {
    if (!tax.topicById.has(id)) return [];
    return uniqueSorted(conceptsOfTopic(tax, id).map((c) => c.id));
  }
  // subject
  if (!tax.subjectById.has(id)) return [];
  const topicIds = new Set(topicsOfSubject(tax, id).map((t) => t.id));
  const conceptIds = tax.concepts
    .filter((c) => c.topicIds.some((tid) => topicIds.has(tid)))
    .map((c) => c.id);
  return uniqueSorted(conceptIds);
}
