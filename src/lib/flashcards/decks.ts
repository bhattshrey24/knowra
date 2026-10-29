/**
 * Group flashcards into per-subject decks for the Quizlet-style study UI.
 *
 * Pure and deterministic (so it's unit-tested and UI-independent): the server
 * resolves each card's subject name, this decides deck membership, ordering and
 * the per-type / due counts the deck tiles display.
 */

import type { FlashcardType } from "@/types/learning";

/** A card as the page hands it in, with its subject already resolved. */
export interface DeckInput {
  id: string;
  slug: string;
  name: string;
  type: FlashcardType;
  front: string;
  back: string;
  /** The concept this card revises, resolved to a display name (Phase 6.2). */
  conceptName?: string;
  /** Whether this card is currently due for spaced-repetition review. */
  due?: boolean;
}

export interface DeckCard {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  conceptName?: string;
  due: boolean;
}

export interface Deck {
  slug: string;
  name: string;
  cards: DeckCard[];
  counts: Record<FlashcardType, number>;
  dueCount: number;
}

/** Weakness cards first (highest value), then foundational, then connections. */
const TYPE_ORDER: Record<FlashcardType, number> = {
  weakness: 0,
  foundational: 1,
  connection: 2,
};

export function groupIntoDecks(cards: DeckInput[]): Deck[] {
  const bySlug = new Map<string, Deck>();

  for (const card of cards) {
    let deck = bySlug.get(card.slug);
    if (!deck) {
      deck = {
        slug: card.slug,
        name: card.name,
        cards: [],
        counts: { weakness: 0, foundational: 0, connection: 0 },
        dueCount: 0,
      };
      bySlug.set(card.slug, deck);
    }
    deck.cards.push({
      id: card.id,
      front: card.front,
      back: card.back,
      type: card.type,
      conceptName: card.conceptName,
      due: Boolean(card.due),
    });
    deck.counts[card.type] += 1;
    if (card.due) deck.dueCount += 1;
  }

  const decks = [...bySlug.values()];
  // Array.sort is stable, so within-type order follows the input order.
  for (const deck of decks) {
    deck.cards.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  }
  decks.sort((a, b) => b.cards.length - a.cards.length || a.name.localeCompare(b.name));
  return decks;
}
