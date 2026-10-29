import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuizSession, type QuizScope } from "@/components/quiz-session";
import { predefinedLearnable } from "@/lib/learnable";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { recommendDifficulty } from "@/lib/learning/recommend";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import type { MasteryState } from "@/lib/learning/mastery";
import type { Difficulty } from "@/types/learning";

/** Resolve an optional ?topic=/?concept= search param to a quiz scope. */
async function resolveScope(sp: {
  topic?: string;
  concept?: string;
}): Promise<QuizScope | undefined> {
  if (!sp.topic && !sp.concept) return undefined;
  const tax = await getTaxonomy();
  if (sp.concept) {
    const concept = tax.conceptById.get(sp.concept);
    if (concept) return { level: "concept", id: concept.id, name: concept.name };
  }
  if (sp.topic) {
    const topic = tax.topicById.get(sp.topic);
    if (topic) return { level: "topic", id: topic.id, name: topic.name };
  }
  return undefined;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const found = predefinedLearnable(domain);
  return { title: found ? `Quiz · ${found.name}` : "Quiz" };
}

/** The personalised difficulty for this user+domain, or undefined if unknown. */
async function recommendedFor(domainSlug: string): Promise<Difficulty | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return undefined;
    const { data } = await supabase
      .from("domain_mastery")
      .select("mastery,confidence,attempts,correct")
      .eq("user_id", user.id)
      .eq("domain_slug", domainSlug)
      .maybeSingle();
    if (!data) return undefined;
    return recommendDifficulty(data as MasteryState);
  } catch {
    return undefined;
  }
}

export default async function QuizStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ topic?: string; concept?: string }>;
}) {
  const { domain } = await params;
  const found = await resolveLearnable(domain);
  if (!found) notFound();

  const [recommendedDifficulty, scope] = await Promise.all([
    recommendedFor(found.slug),
    resolveScope(await searchParams),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Link
        href="/home"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        All subjects
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{scope ? scope.name : found.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {scope ? `A ${scope.level}-level quiz in ${found.name}.` : found.description}
        </p>
      </div>

      <QuizSession
        domainSlug={found.slug}
        domainName={found.name}
        recommendedDifficulty={recommendedDifficulty}
        scope={scope}
      />
    </div>
  );
}
