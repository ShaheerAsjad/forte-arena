/**
 * Pure podium helpers for leaderboard client rendering.
 * Contains no server-side or database dependencies.
 */

export type PodiumAccent = "gold" | "silver" | "bronze";

/**
 * Returns the first three entries of the sorted list (fewer if there are fewer).
 */
export function getPodiumEntries<T>(sortedItems: T[]): T[] {
  return sortedItems.slice(0, 3);
}

/**
 * Derives podium card accent from actual rank.
 */
export function getPodiumAccent(rank: number): PodiumAccent {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  return "bronze";
}
