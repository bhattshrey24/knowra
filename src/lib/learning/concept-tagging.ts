/**
 * Deterministic resolution of an LLM's proposed per-question concept labels to
 * validated taxonomy concept ids (Phase 6.1: "every question maps to a
 * concept"). The model only *proposes* a concept name; this decides the id —
 * matching by normalized name, and round-robining over the allowed concepts
 * for any missing or unrecognised label so every question still gets a valid,
 * in-scope concept.
 */

export interface AllowedConcept {
  id: string;
  name: string;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Return a concept id for each label, aligned to the input order. Unknown or
 * empty labels fall back to the allowed concept at that position (round-robin).
 * Returns null when there are no allowed concepts, so the caller can keep its
 * own default (e.g. a custom topic that isn't in the taxonomy).
 */
export function assignConceptIds(
  labels: (string | undefined)[],
  allowed: AllowedConcept[],
): string[] | null {
  if (allowed.length === 0) return null;

  const byName = new Map(allowed.map((c) => [normalize(c.name), c.id]));

  return labels.map((label, i) => {
    const matched = label ? byName.get(normalize(label)) : undefined;
    return matched ?? allowed[i % allowed.length].id;
  });
}
