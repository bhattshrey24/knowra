import { describe, expect, it } from "vitest";
import { groupIntoDecks, type DeckInput } from "@/lib/flashcards/decks";
import type { FlashcardType } from "@/types/learning";

const mk = (
  id: string,
  slug: string,
  name: string,
  type: FlashcardType,
  due = false,
): DeckInput => ({ id, slug, name, type, front: `front-${id}`, back: `back-${id}`, due });

describe("groupIntoDecks", () => {
  it("groups cards by subject slug into one deck each", () => {
    const decks = groupIntoDecks([
      mk("1", "mathematics", "Mathematics", "weakness"),
      mk("2", "science", "Science", "foundational"),
      mk("3", "mathematics", "Mathematics", "foundational"),
    ]);
    expect(decks).toHaveLength(2);
    const math = decks.find((d) => d.slug === "mathematics");
    expect(math?.name).toBe("Mathematics");
    expect(math?.cards).toHaveLength(2);
  });

  it("counts cards per type and how many are due", () => {
    const [deck] = groupIntoDecks([
      mk("1", "mathematics", "Mathematics", "weakness", true),
      mk("2", "mathematics", "Mathematics", "weakness"),
      mk("3", "mathematics", "Mathematics", "connection"),
    ]);
    expect(deck.counts).toEqual({ weakness: 2, foundational: 0, connection: 1 });
    expect(deck.dueCount).toBe(1);
  });

  it("orders cards within a deck weakness → foundational → connection", () => {
    const [deck] = groupIntoDecks([
      mk("1", "mathematics", "Mathematics", "connection"),
      mk("2", "mathematics", "Mathematics", "weakness"),
      mk("3", "mathematics", "Mathematics", "foundational"),
    ]);
    expect(deck.cards.map((c) => c.type)).toEqual(["weakness", "foundational", "connection"]);
  });

  it("sorts decks by card count (desc), then name", () => {
    const decks = groupIntoDecks([
      mk("1", "science", "Science", "weakness"),
      mk("2", "mathematics", "Mathematics", "weakness"),
      mk("3", "mathematics", "Mathematics", "foundational"),
    ]);
    expect(decks.map((d) => d.slug)).toEqual(["mathematics", "science"]);
  });

  it("returns an empty array when there are no cards", () => {
    expect(groupIntoDecks([])).toEqual([]);
  });
});
