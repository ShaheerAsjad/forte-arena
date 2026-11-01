/**
 * Pure functions for event slug relations (parent/child competitions).
 *
 * Interim convention (no schema changes):
 * - For an event with slug S, child events have slugs starting with `${S}-`.
 *   Example: parent "mehfil-e-naat-2025" -> child "mehfil-e-naat-2025-tilawat".
 * - Slugs like "ai-and-it-expo-2025" vs "ai-and-it-expo-2025x" are NOT related.
 * - Parent slug candidate is derived by trimming trailing hyphen segments in order.
 */

/**
 * Returns true if candidateSlug is a child of parentSlug.
 * Must start with `${parentSlug}-` and not be identical.
 */
export function isChildEventSlug(
  parentSlug?: string | null,
  candidateSlug?: string | null
): boolean {
  if (!parentSlug || !candidateSlug) return false;
  const p = parentSlug.trim().toLowerCase();
  const c = candidateSlug.trim().toLowerCase();
  if (!p || !c || p === c) return false;
  return c.startsWith(`${p}-`);
}

/**
 * Filters a list of candidate events down to those that are children of parentSlug.
 */
export function findChildEvents<T extends { slug: string }>(
  parentSlug: string,
  candidates: readonly T[] | T[] = []
): T[] {
  if (!parentSlug || !Array.isArray(candidates)) return [];
  return candidates.filter((item) => isChildEventSlug(parentSlug, item.slug));
}

/**
 * Generates candidate parent slugs by trimming the last hyphen-delimited segment
 * in successive order (longest prefix first).
 *
 * Example:
 *   "mehfil-e-naat-2025-tilawat" -> ["mehfil-e-naat-2025", "mehfil-e-naat", "mehfil-e", "mehfil"]
 */
export function getCandidateParentSlugs(childSlug?: string | null): string[] {
  if (!childSlug || typeof childSlug !== "string") return [];
  const trimmed = childSlug.trim().toLowerCase();
  const parts = trimmed.split("-");
  if (parts.length <= 1) return [];

  const candidates: string[] = [];
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join("-");
    if (candidate) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

/**
 * Finds the matching parent event from a collection of existing events.
 */
export function findParentEvent<T extends { slug: string }>(
  childSlug: string,
  existingEvents: readonly T[] | T[]
): T | null {
  if (!Array.isArray(existingEvents)) return null;
  const candidates = getCandidateParentSlugs(childSlug);
  for (const cand of candidates) {
    const match = existingEvents.find(
      (e) => e.slug.trim().toLowerCase() === cand
    );
    if (match) return match;
  }
  return null;
}

/**
 * Extracts a clean sub-heading for a child event by removing the parent title prefix.
 *
 * Example:
 *   parent: "Mehfil-e-Naat 2025"
 *   child:  "Mehfil-e-Naat 2025 - Tilawat"
 *   result: "Tilawat"
 */
export function getChildSubHeading(
  parentTitle?: string | null,
  childTitle?: string | null
): string {
  if (!childTitle) return "";
  const c = childTitle.trim();
  if (!parentTitle) return c;

  const p = parentTitle.trim().toLowerCase();
  const cLower = c.toLowerCase();

  if (cLower.startsWith(p)) {
    let remainder = c.slice(parentTitle.trim().length);
    // Strip leading dashes, en-dashes, em-dashes, colons, pipes, slashes, or whitespace
    remainder = remainder.replace(/^[\s\-–—:|/]+/, "").trim();
    if (remainder.length > 0) {
      return remainder;
    }
  }

  return c;
}
