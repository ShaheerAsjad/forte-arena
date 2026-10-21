import { LEADERBOARD_POINTS } from "./leaderboard.config";
import {
  LeaderboardRepository,
  type RawLeaderboardResultItem,
} from "./repositories/leaderboard.repository";

export interface EventResultBreakdown {
  resultId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  position: number;
  points: number;
  award: string | null;
  teamName: string | null;
}

export interface RankedStudentItem {
  rank: number;
  key: string;
  name: string;
  rollNumber: string | null;
  department: string | null;
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  breakdown: EventResultBreakdown[];
}

export interface RankedDepartmentItem {
  rank: number;
  name: string;
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  breakdown: EventResultBreakdown[];
}

export interface LeaderboardData {
  students: RankedStudentItem[];
  departments: RankedDepartmentItem[];
  totalPublishedEvents: number;
}

/**
 * Generates a stable unique identifier for a person across events.
 * Prefers normalized rollNumber (case-insensitive, trimmed).
 * Falls back to userId, then normalized email/name.
 */
export function getPersonStableKey(person: {
  userId?: string | null;
  rollNumber?: string | null;
  name: string;
}): string {
  const normRoll = person.rollNumber?.trim().toUpperCase();
  if (normRoll) {
    return `roll:${normRoll}`;
  }
  if (person.userId?.trim()) {
    return `user:${person.userId.trim()}`;
  }
  return `name:${person.name.trim().toLowerCase()}`;
}

/**
 * Pure function: compares two ranked entities by:
 * 1. Points descending
 * 2. 1st places descending
 * 3. 2nd places descending
 * 4. 3rd places descending
 * 5. Name A-Z ascending (case-insensitive)
 */
export function compareLeaderboardEntries<
  T extends {
    name: string;
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
  }
>(a: T, b: T): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  if (b.firstCount !== a.firstCount) {
    return b.firstCount - a.firstCount;
  }
  if (b.secondCount !== a.secondCount) {
    return b.secondCount - a.secondCount;
  }
  if (b.thirdCount !== a.thirdCount) {
    return b.thirdCount - a.thirdCount;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * Assigns competition ranks (1, 2, 2, 4) to sorted entries.
 * Entries with identical performance (points, 1st, 2nd, 3rd) share the same rank.
 */
export function assignCompetitionRanks<
  T extends {
    name: string;
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
  }
>(sortedEntries: T[]): Array<T & { rank: number }> {
  const result: Array<T & { rank: number }> = [];

  for (let i = 0; i < sortedEntries.length; i++) {
    const curr = sortedEntries[i];
    let rank = i + 1;

    if (i > 0) {
      const prev = sortedEntries[i - 1];
      const isTied =
        curr.totalPoints === prev.totalPoints &&
        curr.firstCount === prev.firstCount &&
        curr.secondCount === prev.secondCount &&
        curr.thirdCount === prev.thirdCount;

      if (isTied) {
        rank = result[i - 1].rank;
      }
    }

    result.push({
      ...curr,
      rank,
    });
  }

  return result;
}

/**
 * Aggregates points and podium counts for individual students.
 * - Only published results count.
 * - Solo: participant receives position points.
 * - Team: EVERY member receives full points.
 * - Multiple finishes for the same person are aggregated by stable key.
 */
export function aggregateStudentStandings(
  results: RawLeaderboardResultItem[],
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS
): RankedStudentItem[] {
  type Accumulator = {
    key: string;
    name: string;
    rollNumber: string | null;
    department: string | null;
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
    breakdown: EventResultBreakdown[];
  };

  const map = new Map<string, Accumulator>();

  for (const item of results) {
    // Exclude unpublished results
    if (!item.event.resultsPublished) continue;

    const points = pointsConfig[item.position] || 0;
    if (points <= 0) continue; // Only podium positions earn points

    // Deduplicate participants within the same winning registration
    const seenInRegistration = new Set<string>();

    for (const participant of item.participants) {
      const stableKey = getPersonStableKey(participant);
      if (seenInRegistration.has(stableKey)) continue;
      seenInRegistration.add(stableKey);

      let record = map.get(stableKey);
      if (!record) {
        record = {
          key: stableKey,
          name: participant.name,
          rollNumber: participant.rollNumber || null,
          department: participant.department || null,
          totalPoints: 0,
          firstCount: 0,
          secondCount: 0,
          thirdCount: 0,
          breakdown: [],
        };
        map.set(stableKey, record);
      } else {
        // Enhance missing details if available in newer item
        if (!record.rollNumber && participant.rollNumber) {
          record.rollNumber = participant.rollNumber;
        }
        if (!record.department && participant.department) {
          record.department = participant.department;
        }
      }

      record.totalPoints += points;
      if (item.position === 1) record.firstCount += 1;
      else if (item.position === 2) record.secondCount += 1;
      else if (item.position === 3) record.thirdCount += 1;

      record.breakdown.push({
        resultId: item.id,
        eventId: item.event.id,
        eventTitle: item.event.title,
        eventSlug: item.event.slug,
        position: item.position,
        points,
        award: item.award,
        teamName: item.teamName,
      });
    }
  }

  // Sort breakdowns per student by position asc, points desc
  for (const record of map.values()) {
    record.breakdown.sort((a, b) => a.position - b.position || b.points - a.points);
  }

  const sorted = Array.from(map.values()).sort(compareLeaderboardEntries);
  return assignCompetitionRanks(sorted);
}

export {
  getPodiumEntries,
  getPodiumAccent,
  type PodiumAccent,
} from "./leaderboard.podium";


/**
 * Normalizes a department name for grouping:
 * Trims leading/trailing whitespace, collapses repeated internal spaces, and lowercases.
 */
export function normalizeDepartmentName(dept: string): string {
  return dept.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Aggregates points and podium counts for academic departments.
 * - Only published results count.
 * - A winning registration gives its points ONCE to each distinct department
 *   among its participants (not multiplied by team size).
 * - Group departments case-insensitively after trimming and collapsing repeated whitespace,
 *   and display the first-seen spelling.
 * - Participants without a department are ignored.
 */
export function aggregateDepartmentStandings(
  results: RawLeaderboardResultItem[],
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS
): RankedDepartmentItem[] {
  type DeptAccumulator = {
    normalizedName: string;
    displayName: string;
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
    breakdown: EventResultBreakdown[];
  };

  const map = new Map<string, DeptAccumulator>();

  for (const item of results) {
    if (!item.event.resultsPublished) continue;

    const points = pointsConfig[item.position] || 0;
    if (points <= 0) continue;

    // Collect distinct departments in this result (keyed by normalizedName, storing first-seen display spelling in this result)
    const distinctDeptsInResult = new Map<string, string>();
    for (const p of item.participants) {
      if (!p.department) continue;
      const collapsed = p.department.trim().replace(/\s+/g, " ");
      if (!collapsed) continue;
      const normKey = normalizeDepartmentName(collapsed);
      if (!distinctDeptsInResult.has(normKey)) {
        distinctDeptsInResult.set(normKey, collapsed);
      }
    }

    for (const [normKey, firstSeenInResult] of distinctDeptsInResult.entries()) {
      let record = map.get(normKey);
      if (!record) {
        record = {
          normalizedName: normKey,
          displayName: firstSeenInResult, // First-seen spelling across all events
          totalPoints: 0,
          firstCount: 0,
          secondCount: 0,
          thirdCount: 0,
          breakdown: [],
        };
        map.set(normKey, record);
      }

      record.totalPoints += points;
      if (item.position === 1) record.firstCount += 1;
      else if (item.position === 2) record.secondCount += 1;
      else if (item.position === 3) record.thirdCount += 1;

      record.breakdown.push({
        resultId: item.id,
        eventId: item.event.id,
        eventTitle: item.event.title,
        eventSlug: item.event.slug,
        position: item.position,
        points,
        award: item.award,
        teamName: item.teamName,
      });
    }
  }

  for (const record of map.values()) {
    record.breakdown.sort((a, b) => a.position - b.position || b.points - a.points);
  }

  const mapped = Array.from(map.values()).map((acc) => ({
    name: acc.displayName,
    totalPoints: acc.totalPoints,
    firstCount: acc.firstCount,
    secondCount: acc.secondCount,
    thirdCount: acc.thirdCount,
    breakdown: acc.breakdown,
  }));

  const sorted = mapped.sort(compareLeaderboardEntries);
  return assignCompetitionRanks(sorted);
}

/**
 * Builds full leaderboard data including students, departments, and event totals.
 */
export function buildLeaderboardData(
  results: RawLeaderboardResultItem[],
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS
): LeaderboardData {
  const students = aggregateStudentStandings(results, pointsConfig);
  const departments = aggregateDepartmentStandings(results, pointsConfig);

  const publishedEventIds = new Set(
    results.filter((r) => r.event.resultsPublished).map((r) => r.event.id)
  );

  return {
    students,
    departments,
    totalPublishedEvents: publishedEventIds.size,
  };
}

export class LeaderboardService {
  /**
   * Fetches published results from the repository and computes student & department rankings.
   */
  static async getLeaderboardData(): Promise<LeaderboardData> {
    const rawResults = await LeaderboardRepository.getPublishedResults();
    return buildLeaderboardData(rawResults);
  }
}
