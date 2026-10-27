import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuizSession } from "@/components/quiz-session";
import { predefinedLearnable } from "@/lib/learnable";
import { resolveLearnable } from "@/lib/db/learnable-server";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { recommendDifficulty } from "@/lib/learning/recommend";
import type { MasteryState } from "@/lib/learning/mastery";
import type { Difficulty } from "@/types/learning";

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

export default async function QuizStartPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const found = await resolveLearnable(domain);
  if (!found) notFound();

  const recommendedDifficulty = await recommendedFor(found.slug);

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
        <h1 className="text-2xl font-semibold tracking-tight">{found.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{found.description}</p>
      </div>

      <QuizSession
        domainSlug={found.slug}
        domainName={found.name}
        recommendedDifficulty={recommendedDifficulty}
      />
    </div>
  );
}
