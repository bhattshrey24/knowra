import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Flashcard } from "@/components/flashcard";
import { DOMAINS } from "@/lib/domains";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { FlashcardType } from "@/types/learning";

export const metadata = { title: "Flashcards" };
export const dynamic = "force-dynamic";

interface CardRow {
  id: string;
  domain_slug: string;
  type: FlashcardType;
  front: string;
  back: string;
}

async function loadCards(): Promise<CardRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("flashcards")
    .select("id,domain_slug,type,front,back")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as CardRow[] | null) ?? [];
}

function domainName(slug: string): string {
  return DOMAINS.find((d) => d.slug === slug)?.name ?? slug;
}

function Section({
  title,
  description,
  badge,
  cards,
}: {
  title: string;
  description: string;
  badge: React.ReactNode;
  cards: CardRow[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        {badge}
        <span className="text-muted-foreground text-sm">· {cards.length}</span>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Flashcard key={c.id} front={c.front} back={c.back} hint={domainName(c.domain_slug)} />
        ))}
      </div>
    </section>
  );
}

export default async function FlashcardsPage() {
  const cards = await loadCards();

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

  const weakness = cards.filter((c) => c.type === "weakness");
  const foundational = cards.filter((c) => c.type === "foundational");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tap a card to reveal the answer. Weakness cards target what you got wrong; foundational
          cards reinforce the essentials.
        </p>
      </div>

      {weakness.length > 0 && (
        <Section
          title="Weakness"
          description="Concepts you missed — the highest-value things to review."
          badge={<Badge variant="destructive">Review</Badge>}
          cards={weakness}
        />
      )}

      {foundational.length > 0 && (
        <Section
          title="Foundational"
          description="Core concepts worth keeping sharp, including ones you already know."
          badge={<Badge variant="secondary">Foundational</Badge>}
          cards={foundational}
        />
      )}
    </div>
  );
}
