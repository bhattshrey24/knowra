import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { FlashcardsBrowser } from "@/components/flashcards-browser";
import { type ReviewCard } from "@/components/flashcard-review";
import { predefinedLearnable } from "@/lib/learnable";
import { createClient } from "@/lib/db/server";
import { customTitleMap } from "@/lib/db/learnable-server";
import { isSupabaseConfigured } from "@/lib/env";
import { buildFlashcardCatalogue } from "@/lib/flashcards/catalogue";
import { orderByConceptWeakness } from "@/lib/learning/flashcards";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import type { FlashcardType } from "@/types/learning";

export const metadata = { title: "Flashcards" };
export const dynamic = "force-dynamic";

interface CardRow {
  id: string;
  domain_slug: string;
  concept_id: string | null;
  type: FlashcardType;
  front: string;
  back: string;
  due_at: string;
}

async function loadCards(): Promise<{
  cards: CardRow[];
  titles: Map<string, string>;
  masteryByConcept: Map<string, number>;
}> {
  const empty = { cards: [], titles: new Map(), masteryByConcept: new Map() };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const [cardsRes, masteryRes, titles] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id,domain_slug,concept_id,type,front,back,due_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("concept_mastery").select("concept_id,mastery").eq("user_id", user.id),
    customTitleMap(),
  ]);
  const masteryByConcept = new Map<string, number>(
    (masteryRes.data ?? []).map((m) => [m.concept_id as string, m.mastery as number]),
  );
  return { cards: (cardsRes.data as CardRow[] | null) ?? [], titles, masteryByConcept };
}

function displayName(slug: string, titles: Map<string, string>): string {
  return predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
}

export default async function FlashcardsPage() {
  const { cards, titles, masteryByConcept } = await loadCards();

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
  const tax = await getTaxonomy();
  const conceptName = (id: string | null) => (id && tax.conceptById.get(id)?.name) || undefined;

  // Revise the weakest concepts first (Phase 6.2).
  const dueOrdered = orderByConceptWeakness(
    cards.filter(isDue).map((c) => ({ ...c, conceptId: c.concept_id ?? undefined })),
    masteryByConcept,
  );
  const dueCards: ReviewCard[] = dueOrdered.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    label: conceptName(c.concept_id) ?? displayName(c.domain_slug, titles),
  }));

  const catalogue = buildFlashcardCatalogue(
    cards.map((c) => ({
      id: c.id,
      domainSlug: c.domain_slug,
      subjectName: displayName(c.domain_slug, titles),
      conceptId: c.concept_id,
      type: c.type,
      front: c.front,
      back: c.back,
      due: isDue(c),
    })),
    tax,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review what&apos;s due, or browse your cards by subject, topic, or concept.
        </p>
      </div>

      <FlashcardsBrowser catalogue={catalogue} dueCards={dueCards} />
    </div>
  );
}
