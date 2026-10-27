import "server-only";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isCustomSlug, predefinedLearnable, type Learnable } from "@/lib/learnable";

/**
 * Resolve a slug to a learnable the current user may quiz on: a predefined
 * domain, or one of their own custom topics. Returns null for anything else
 * (another user's topic, an unknown slug, or custom topics without a backend).
 */
export async function resolveLearnable(slug: string): Promise<Learnable | null> {
  const predefined = predefinedLearnable(slug);
  if (predefined) return predefined;
  if (!isCustomSlug(slug) || !isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("custom_topics")
    .select("slug,title")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;

  return { slug: data.slug, name: data.title, description: "Your custom topic.", isCustom: true };
}

/** Map of custom slug → title for the current user, for display on dashboards. */
export async function customTitleMap(): Promise<Map<string, string>> {
  if (!isSupabaseConfigured()) return new Map();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();
  const { data } = await supabase.from("custom_topics").select("slug,title").eq("user_id", user.id);
  return new Map((data ?? []).map((t) => [t.slug as string, t.title as string]));
}
