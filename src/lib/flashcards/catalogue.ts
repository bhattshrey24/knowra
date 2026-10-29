/**
 * Group a learner's flashcards by taxonomy level (subject / topic / concept)
 * for the flashcards browser, with per-group card and due counts. Pure and
 * deterministic: the server resolves names, this decides grouping, counts and
 * order. A card with a shared concept appears under each of its topics.
 */

import type { FlashcardType } from "@/types/learning";
import { subjectsOfConcept, type Taxonomy } from "@/lib/learning/taxonomy";

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  conceptName?: string;
  due: boolean;
}

export type FlashLevel = "subjects" | "topics" | "concepts";

export interface FlashGroup {
  id: string;
  name: string;
  /** Parent context, e.g. "Mathematics" or "Mathematics · Algebra". */
  parentLabel?: string;
  /** Subject slug, for the row icon. */
  subjectId: string;
  total: number;
  due: number;
  cards: StudyCard[];
}

export interface FlashcardCatalogue {
  subjects: FlashGroup[];
  topics: FlashGroup[];
  concepts: FlashGroup[];
}

/** A flashcard as the page hands it in, with its subject name resolved. */
export interface FlashCardInput {
  id: string;
  domainSlug: string;
  subjectName: string;
  conceptId?: string | null;
  type: FlashcardType;
  front: string;
  back: string;
  due: boolean;
}

function toStudyCard(c: FlashCardInput, conceptName?: string): StudyCard {
  return { id: c.id, front: c.front, back: c.back, type: c.type, conceptName, due: c.due };
}

/** Most to review first: due desc, then size desc, then name. */
function sortGroups(groups: FlashGroup[]): FlashGroup[] {
  return groups.sort((a, b) => b.due - a.due || b.total - a.total || a.name.localeCompare(b.name));
}

function finalize(map: Map<string, FlashGroup>): FlashGroup[] {
  for (const g of map.values()) {
    g.total = g.cards.length;
    g.due = g.cards.filter((c) => c.due).length;
  }
  return sortGroups([...map.values()]);
}

export function buildFlashcardCatalogue(
  cards: FlashCardInput[],
  tax: Taxonomy,
): FlashcardCatalogue {
  const subjects = new Map<string, FlashGroup>();
  const topics = new Map<string, FlashGroup>();
  const concepts = new Map<string, FlashGroup>();

  const ensure = (
    map: Map<string, FlashGroup>,
    id: string,
    init: () => Omit<FlashGroup, "cards" | "total" | "due">,
  ): FlashGroup => {
    let g = map.get(id);
    if (!g) {
      g = { ...init(), total: 0, due: 0, cards: [] };
      map.set(id, g);
    }
    return g;
  };

  for (const card of cards) {
    const concept = card.conceptId ? tax.conceptById.get(card.conceptId) : undefined;
    const study = toStudyCard(card, concept?.name);

    // Subjects — every card, grouped by its subject slug.
    ensure(subjects, card.domainSlug, () => ({
      id: card.domainSlug,
      name: card.subjectName,
      subjectId: card.domainSlug,
    })).cards.push(study);

    if (!concept) continue; // custom / untagged cards have no topic or concept

    // Concepts — grouped by concept id.
    const subjectId = subjectsOfConcept(tax, concept.id)[0] ?? card.domainSlug;
    const firstTopicName = tax.topicById.get(concept.topicIds[0])?.name;
    const subjectName = tax.subjectById.get(subjectId)?.name;
    ensure(concepts, concept.id, () => ({
      id: concept.id,
      name: concept.name,
      subjectId,
      parentLabel: [subjectName, firstTopicName].filter(Boolean).join(" · ") || undefined,
    })).cards.push(study);

    // Topics — one group per topic the concept belongs to.
    for (const topicId of concept.topicIds) {
      const topic = tax.topicById.get(topicId);
      if (!topic) continue;
      ensure(topics, topicId, () => ({
        id: topicId,
        name: topic.name,
        subjectId: topic.subjectId,
        parentLabel: tax.subjectById.get(topic.subjectId)?.name,
      })).cards.push(study);
    }
  }

  return {
    subjects: finalize(subjects),
    topics: finalize(topics),
    concepts: finalize(concepts),
  };
}
