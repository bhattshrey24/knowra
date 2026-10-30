import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { buildTaxonomy, type Taxonomy, type TaxonomyInput } from "@/lib/learning/taxonomy";
import { SEED_TAXONOMY } from "@/lib/taxonomy/seed";
import { rowsToTaxonomy, taxonomyToRows, type TaxonomyRows } from "@/lib/taxonomy/rows";
import { createLogger, errorContext } from "@/lib/log";
import type { ResolvedClassification } from "@/lib/learning/classify";

const log = createLogger("db/taxonomy");

/**
 * Data access for the shared taxonomy (Phase 6.1). Reads and writes use the
 * service-role client: the taxonomy is a global catalog, so it bypasses the
 * per-user RLS. The deterministic engine (`learning/taxonomy.ts`) owns the
 * shape; this module only moves rows in and out of Postgres.
 */

export interface SeedResult {
  subjects: number;
  topics: number;
  concepts: number;
  conceptTopics: number;
}

/**
 * Upsert the taxonomy into the shared tables. Idempotent (upsert on primary
 * key), so re-running never creates duplicates — the catalog can be re-seeded
 * or expanded safely. Requires Supabase + the service-role key.
 */
export async function seedTaxonomy(input: TaxonomyInput = SEED_TAXONOMY): Promise<SeedResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  const rows = taxonomyToRows(input);
  const db = createAdminClient();

  // Order matters: parents before children so foreign keys resolve.
  const subjects = await db.from("subjects").upsert(rows.subjects, { onConflict: "id" });
  if (subjects.error) throw new Error(`seed subjects: ${subjects.error.message}`);

  const topics = await db.from("topics").upsert(rows.topics, { onConflict: "id" });
  if (topics.error) throw new Error(`seed topics: ${topics.error.message}`);

  const concepts = await db.from("concepts").upsert(rows.concepts, { onConflict: "id" });
  if (concepts.error) throw new Error(`seed concepts: ${concepts.error.message}`);

  const links = await db
    .from("concept_topics")
    .upsert(rows.conceptTopics, { onConflict: "concept_id,topic_id" });
  if (links.error) throw new Error(`seed concept_topics: ${links.error.message}`);

  return {
    subjects: rows.subjects.length,
    topics: rows.topics.length,
    concepts: rows.concepts.length,
    conceptTopics: rows.conceptTopics.length,
  };
}

/**
 * Persist a resolved classification into the shared taxonomy (Phase 6.3),
 * creating any new subject/topic/concept and linking the concept to the topic.
 * Idempotent upserts, so reusing existing nodes just ensures the link exists.
 * Returns the ids to quiz on.
 */
export async function saveClassification(
  r: ResolvedClassification,
): Promise<{ subjectId: string; topicId: string; conceptId: string }> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const db = createAdminClient();

  const subject = await db
    .from("subjects")
    .upsert({ id: r.subject.id, name: r.subject.name }, { onConflict: "id" });
  if (subject.error) throw new Error(`save subject: ${subject.error.message}`);

  const topic = await db
    .from("topics")
    .upsert({ id: r.topic.id, subject_id: r.subject.id, name: r.topic.name }, { onConflict: "id" });
  if (topic.error) throw new Error(`save topic: ${topic.error.message}`);

  const concept = await db
    .from("concepts")
    .upsert({ id: r.concept.id, name: r.concept.name }, { onConflict: "id" });
  if (concept.error) throw new Error(`save concept: ${concept.error.message}`);

  const link = await db
    .from("concept_topics")
    .upsert(
      { concept_id: r.concept.id, topic_id: r.topic.id },
      { onConflict: "concept_id,topic_id" },
    );
  if (link.error) throw new Error(`save link: ${link.error.message}`);

  return { subjectId: r.subject.id, topicId: r.topic.id, conceptId: r.concept.id };
}

/**
 * Read the taxonomy from the database, or null when Supabase is unconfigured or
 * the catalog is empty (not yet seeded) — callers fall back to the seed.
 */
export async function fetchTaxonomyFromDb(): Promise<TaxonomyInput | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createAdminClient();

  const [subjects, topics, concepts, conceptTopics] = await Promise.all([
    db.from("subjects").select("id,name,description"),
    db.from("topics").select("id,subject_id,name"),
    db.from("concepts").select("id,name,foundational_weight"),
    db.from("concept_topics").select("concept_id,topic_id"),
  ]);

  const firstError =
    subjects.error ?? topics.error ?? concepts.error ?? conceptTopics.error ?? null;
  if (firstError) throw new Error(`fetch taxonomy: ${firstError.message}`);
  if (!subjects.data?.length) return null; // not seeded yet

  return rowsToTaxonomy({
    subjects: subjects.data,
    topics: topics.data ?? [],
    concepts: concepts.data ?? [],
    conceptTopics: conceptTopics.data ?? [],
  } as TaxonomyRows);
}

/**
 * The single accessor runtime code should use to get the taxonomy: the shared
 * DB catalog when it's available, otherwise the in-memory seed. Always returns
 * a validated, indexed `Taxonomy`, so the app works with or without a backend.
 */
export async function getTaxonomy(): Promise<Taxonomy> {
  try {
    const fromDb = await fetchTaxonomyFromDb();
    if (fromDb) return buildTaxonomy(fromDb);
  } catch (err) {
    log.warn("DB read failed, falling back to in-memory seed", errorContext(err));
  }
  return buildTaxonomy(SEED_TAXONOMY);
}
