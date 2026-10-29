import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { CatalogueTabs } from "@/components/catalogue-tabs";
import { ContinueLearning, type ContinueLearningData } from "@/components/continue-learning";
import { getTaxonomy } from "@/lib/db/taxonomy-server";
import { buildCatalogue } from "@/lib/taxonomy/catalogue";
import { createClient } from "@/lib/db/server";
import { customTitleMap } from "@/lib/db/learnable-server";
import { predefinedLearnable } from "@/lib/learnable";
import { isSupabaseConfigured } from "@/lib/env";
import { masteryOutOfTen, type MasteryState } from "@/lib/learning/mastery";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

interface MasteryRow extends MasteryState {
  domain_slug: string;
}

/** Recent subjects (with progress) and cards due for revision, from real data. */
async function loadContinueLearning(): Promise<ContinueLearningData> {
  const empty: ContinueLearningData = { recent: [] };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const now = new Date().toISOString();
  const [attemptsRes, masteryRes, dueRes, titles] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select("domain_slug,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("domain_mastery")
      .select("domain_slug,mastery,confidence,attempts,correct")
      .eq("user_id", user.id),
    supabase
      .from("flashcards")
      .select("domain_slug,due_at")
      .eq("user_id", user.id)
      .lte("due_at", now)
      .limit(200),
    customTitleMap(),
  ]);

  const name = (slug: string) => predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
  const masteryBySlug = new Map(
    ((masteryRes.data as MasteryRow[] | null) ?? []).map((m) => [m.domain_slug, m]),
  );

  // Count cards currently due, per subject.
  const dueBySlug = new Map<string, number>();
  for (const c of dueRes.data ?? []) {
    const slug = c.domain_slug as string;
    dueBySlug.set(slug, (dueBySlug.get(slug) ?? 0) + 1);
  }

  // Most-recent distinct subjects (up to 4), with their mastery and due count.
  const recent: ContinueLearningData["recent"] = [];
  const seen = new Set<string>();
  for (const a of attemptsRes.data ?? []) {
    const slug = a.domain_slug as string;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const m = masteryBySlug.get(slug);
    recent.push({
      slug,
      name: name(slug),
      outOfTen: m ? masteryOutOfTen(m) : 0,
      accuracy: m && m.attempts ? Math.round((m.correct / m.attempts) * 100) : 0,
      dueCount: dueBySlug.get(slug) ?? 0,
    });
    if (recent.length >= 4) break;
  }

  return { recent };
}

export default async function HomePage() {
  const [tax, cont] = await Promise.all([getTaxonomy(), loadContinueLearning()]);
  const catalogue = buildCatalogue(tax);
  const hasHistory = cont.recent.length > 0;

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What will you learn today?</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Explore something new or strengthen what you already know.
          </p>
        </div>
        <HomeSearch items={catalogue.searchItems} canCreateCustom={isSupabaseConfigured()} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Explore the catalogue</h2>
        <CatalogueTabs catalogue={catalogue} />
      </section>

      {hasHistory && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Continue learning</h2>
            <Link href="/dashboard" className="text-primary text-sm font-medium hover:underline">
              View all
            </Link>
          </div>
          <ContinueLearning data={cont} />
        </section>
      )}
    </div>
  );
}
