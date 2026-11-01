import { LEADERBOARD_POINTS } from "./leaderboard.config";
import {
  LeaderboardRepository,
  type RawLeaderboardResultItem,
} from "./repositories/leaderboard.repository";
import {
  DEPARTMENTS,
  resolveDepartmentLabel,
} from "@/features/profile/academic.config";

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

export interface TeamMemberSummary {
  name: string;
  rollNumber: string | null;
  department: string | null;
}

export interface TeamLeaderboardEntry {
  rank: number;
  teamName: string;
  totalPoints: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  members: TeamMemberSummary[];
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
  teams: TeamLeaderboardEntry[];
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
 * Normalizes a team name for grouping across events:
 * Trims leading/trailing whitespace, collapses internal spaces, and lowercases.
 */
export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
  } & ({ name: string } | { teamName: string })
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
  const nameA = "teamName" in a ? a.teamName : a.name;
  const nameB = "teamName" in b ? b.teamName : b.name;
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}

/**
 * Assigns competition ranks (1, 2, 2, 4) to sorted entries.
 * Entries with identical performance (points, 1st, 2nd, 3rd) share the same rank.
 */
export function assignCompetitionRanks<
  T extends {
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
 * - Team results: excluded (points go to Teams standing, not students).
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

    // Decision 2: Team results do NOT appear in student standings
    if (item.isTeam || item.teamName !== null) continue;

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

/**
 * Aggregates points and podium counts for teams as ONE unit.
 * - Only published results count.
 * - Groups entries by normalized team name across events (displaying first-seen spelling).
 * - Collects members across finishes.
 * - Team points are credited as one unit (never duplicated per member).
 */
export function aggregateTeamStandings(
  results: RawLeaderboardResultItem[],
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS
): TeamLeaderboardEntry[] {
  type TeamAccumulator = {
    normalizedName: string;
    displayName: string;
    totalPoints: number;
    firstCount: number;
    secondCount: number;
    thirdCount: number;
    membersMap: Map<string, TeamMemberSummary>;
    breakdown: EventResultBreakdown[];
  };

  const map = new Map<string, TeamAccumulator>();

  for (const item of results) {
    if (!item.event.resultsPublished) continue;
    if (!item.isTeam && !item.teamName) continue;

    const points = pointsConfig[item.position] || 0;
    if (points <= 0) continue;

    const rawTeamName = item.teamName?.trim() || "Team";
    const normKey = normalizeTeamName(rawTeamName);
    const collapsedDisplay = rawTeamName.replace(/\s+/g, " ");

    let record = map.get(normKey);
    if (!record) {
      record = {
        normalizedName: normKey,
        displayName: collapsedDisplay,
        totalPoints: 0,
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        membersMap: new Map(),
        breakdown: [],
      };
      map.set(normKey, record);
    }

    record.totalPoints += points;
    if (item.position === 1) record.firstCount += 1;
    else if (item.position === 2) record.secondCount += 1;
    else if (item.position === 3) record.thirdCount += 1;

    // Collect and deduplicate team members
    for (const p of item.participants) {
      const memberKey = p.rollNumber
        ? p.rollNumber.trim().toUpperCase()
        : p.userId
        ? `user:${p.userId}`
        : `name:${p.name.trim().toLowerCase()}`;

      const existingMember = record.membersMap.get(memberKey);
      if (!existingMember) {
        record.membersMap.set(memberKey, {
          name: p.name,
          rollNumber: p.rollNumber || null,
          department: p.department || null,
        });
      } else {
        if (!existingMember.rollNumber && p.rollNumber) {
          existingMember.rollNumber = p.rollNumber;
        }
        if (!existingMember.department && p.department) {
          existingMember.department = p.department;
        }
      }
    }

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

  for (const record of map.values()) {
    record.breakdown.sort((a, b) => a.position - b.position || b.points - a.points);
  }

  const mapped = Array.from(map.values()).map((acc) => ({
    teamName: acc.displayName,
    totalPoints: acc.totalPoints,
    firstCount: acc.firstCount,
    secondCount: acc.secondCount,
    thirdCount: acc.thirdCount,
    members: Array.from(acc.membersMap.values()),
    breakdown: acc.breakdown,
  }));

  const sorted = mapped.sort(compareLeaderboardEntries);
  return assignCompetitionRanks(sorted);
}

export {
  getPodiumEntries,
  getPodiumAccent,
  type PodiumAccent,
} from "./leaderboard.podium";

export {
  getMemberPreview,
  type MemberPreviewResult,
} from "./leaderboard.config";

/**
 * Normalizes a department name for grouping:
 * Trims leading/trailing whitespace, collapses repeated internal spaces, and lowercases.
 */
export function normalizeDepartmentName(dept: string): string {
  return dept.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Validates and matches a department against valid DEPARTMENTS.
 * Returns canonical label, normalized key, and first-seen display string, or null if invalid.
 */
export function resolveValidDepartment(
  dept: unknown
): { canonicalLabel: string; normalizedKey: string; rawDisplay: string } | null {
  if (typeof dept !== "string") return null;
  const trimmed = dept.trim();
  if (!trimmed) return null;

  const direct = resolveDepartmentLabel(trimmed);
  if (direct) {
    const isCode = DEPARTMENTS.some(
      (d) => d.value === trimmed && d.value !== d.label
    );
    return {
      canonicalLabel: direct,
      normalizedKey: normalizeDepartmentName(direct),
      rawDisplay: isCode ? direct : trimmed.replace(/\s+/g, " "),
    };
  }

  // Check if case-insensitive / normalized form matches any valid department label or code
  const norm = normalizeDepartmentName(trimmed);
  const matched = DEPARTMENTS.find(
    (d) =>
      normalizeDepartmentName(d.label) === norm ||
      normalizeDepartmentName(d.value) === norm
  );
  if (matched) {
    const isCode =
      normalizeDepartmentName(matched.value) === norm &&
      matched.value !== matched.label;
    return {
      canonicalLabel: matched.label,
      normalizedKey: normalizeDepartmentName(matched.label),
      rawDisplay: isCode ? matched.label : trimmed.replace(/\s+/g, " "),
    };
  }
  return null;
}

/**
 * Aggregates points and podium counts for academic departments.
 * - Only published results count.
 * - Decision 3:
 *   - Solo result: counts for participant's department (only valid DEPARTMENTS value).
 *   - Team result: counts for a department ONLY if EVERY member (leader included)
 *     has the same valid department. If mixed, missing, or invalid, 0 points to departments.
 * - Points are credited ONCE per winning registration.
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

    let targetDept: {
      canonicalLabel: string;
      normalizedKey: string;
      rawDisplay: string;
    } | null = null;

    if (item.isTeam || item.teamName !== null) {
      // Decision 3: Team result counts for department ONLY if EVERY member has the same valid department
      if (item.participants.length === 0) {
        continue;
      }

      const resolvedDepts = item.participants.map((p) =>
        resolveValidDepartment(p.department)
      );

      // Any missing or invalid department disqualifies department credit
      const anyMissingOrInvalid = resolvedDepts.some((d) => d === null);
      if (anyMissingOrInvalid) {
        continue;
      }

      const firstDept = resolvedDepts[0]!;
      const allShareSameDept = resolvedDepts.every(
        (d) => d?.normalizedKey === firstDept.normalizedKey
      );
      if (!allShareSameDept) {
        continue;
      }

      targetDept = firstDept;
    } else {
      // Solo result: counts for participant's valid department
      const participant = item.participants[0];
      if (!participant || !participant.department) {
        continue;
      }
      targetDept = resolveValidDepartment(participant.department);
      if (!targetDept) {
        continue;
      }
    }

    const normKey = targetDept.normalizedKey;

    let record = map.get(normKey);
    if (!record) {
      record = {
        normalizedName: normKey,
        displayName: targetDept.rawDisplay,
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
 * Builds full leaderboard data including students, teams, departments, and event totals.
 */
export function buildLeaderboardData(
  results: RawLeaderboardResultItem[],
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS
): LeaderboardData {
  const students = aggregateStudentStandings(results, pointsConfig);
  const teams = aggregateTeamStandings(results, pointsConfig);
  const departments = aggregateDepartmentStandings(results, pointsConfig);

  const publishedEventIds = new Set(
    results.filter((r) => r.event.resultsPublished).map((r) => r.event.id)
  );

  return {
    students,
    teams,
    departments,
    totalPublishedEvents: publishedEventIds.size,
  };
}

export class LeaderboardService {
  /**
   * Fetches published results from the repository and computes rankings.
   */
  static async getLeaderboardData(): Promise<LeaderboardData> {
    const rawResults = await LeaderboardRepository.getPublishedResults();
    return buildLeaderboardData(rawResults);
  }
}
