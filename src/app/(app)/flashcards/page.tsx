import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DeckBrowser } from "@/components/deck-browser";
import { ReviewSession, type DueCard } from "@/components/review-session";
import { predefinedLearnable } from "@/lib/learnable";
import { createClient } from "@/lib/db/server";
import { customTitleMap } from "@/lib/db/learnable-server";
import { isSupabaseConfigured } from "@/lib/env";
import { groupIntoDecks } from "@/lib/flashcards/decks";
import type { FlashcardType } from "@/types/learning";

export const metadata = { title: "Flashcards" };
export const dynamic = "force-dynamic";

interface CardRow {
  id: string;
  domain_slug: string;
  type: FlashcardType;
  front: string;
  back: string;
  due_at: string;
}

async function loadCards(): Promise<{ cards: CardRow[]; titles: Map<string, string> }> {
  if (!isSupabaseConfigured()) return { cards: [], titles: new Map() };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cards: [], titles: new Map() };
  const [cardsRes, titles] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id,domain_slug,type,front,back,due_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    customTitleMap(),
  ]);
  return { cards: (cardsRes.data as CardRow[] | null) ?? [], titles };
}

function displayName(slug: string, titles: Map<string, string>): string {
  return predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
}

export default async function FlashcardsPage() {
  const { cards, titles } = await loadCards();

  if (cards.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Personalised revision cards for your weak concepts, plus foundational cards for the
            essentials.
          </p>
        </div>
        <EmptyState
          icon={Layers}
          title="No cards yet"
          description="Answer a quiz and Knowra turns your mistakes into weakness cards and your wins into foundational cards."
        >
          <Button render={<Link href="/home" />}>Take a quiz</Button>
        </EmptyState>
      </div>
    );
  }

  const now = Date.now();
  const isDue = (c: CardRow) => new Date(c.due_at).getTime() <= now;

  const dueCards: DueCard[] = cards.filter(isDue).map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    hint: displayName(c.domain_slug, titles),
  }));

  const decks = groupIntoDecks(
    cards.map((c) => ({
      id: c.id,
      slug: c.domain_slug,
      name: displayName(c.domain_slug, titles),
      type: c.type,
      front: c.front,
      back: c.back,
      due: isDue(c),
    })),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Each subject is a deck. Open one to study its cards — tap to flip, swipe to move on.
        </p>
      </div>

      {dueCards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            Due for review <span className="text-muted-foreground">· {dueCards.length}</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Spaced repetition brings cards back at the right time. Rate your recall to reschedule
            each one.
          </p>
          <ReviewSession cards={dueCards} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          Your decks <span className="text-muted-foreground">· {decks.length}</span>
        </h2>
        <p className="text-muted-foreground text-sm">
          Weakness cards target what you got wrong, foundational cards reinforce the essentials, and
          connections link ideas to subjects you already know.
        </p>
        <DeckBrowser decks={decks} />
      </section>
    </div>
  );
}
