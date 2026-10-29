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
  const empty: ContinueLearningData = { recent: [], revise: [] };
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
      .select("id,domain_slug,front,due_at")
      .eq("user_id", user.id)
      .lte("due_at", now)
      .limit(6),
    customTitleMap(),
  ]);

  const name = (slug: string) => predefinedLearnable(slug)?.name ?? titles.get(slug) ?? slug;
  const masteryBySlug = new Map(
    ((masteryRes.data as MasteryRow[] | null) ?? []).map((m) => [m.domain_slug, m]),
  );

  // Most-recent distinct subjects (up to 4), with their mastery.
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
    });
    if (recent.length >= 4) break;
  }

  const revise = (dueRes.data ?? []).map((c) => ({
    id: c.id as string,
    front: c.front as string,
    hint: name(c.domain_slug as string),
  }));

  return { recent, revise };
}

export default async function HomePage() {
  const [tax, cont] = await Promise.all([getTaxonomy(), loadContinueLearning()]);
  const catalogue = buildCatalogue(tax);
  const hasHistory = cont.recent.length > 0 || cont.revise.length > 0;

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What do you want to learn?</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Search the catalogue or type anything. Knowra learns what you know from how you answer.
          </p>
        </div>
        <HomeSearch items={catalogue.searchItems} canCreateCustom={isSupabaseConfigured()} />
      </div>

      {hasHistory && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Continue learning</h2>
          <ContinueLearning data={cont} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Explore the catalogue</h2>
        <CatalogueTabs catalogue={catalogue} />
      </section>
    </div>
  );
}
