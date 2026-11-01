/**
 * Leaderboard Configuration & Scoring Rules
 */

export const LEADERBOARD_POINTS: Readonly<Record<number, number>> = Object.freeze({
  1: 5,
  2: 3,
  3: 1,
});

export type LeaderboardView = "students" | "teams" | "departments";

export const DEFAULT_LEADERBOARD_VIEW: LeaderboardView = "students";

/**
 * Validates and normalizes the leaderboard view param.
 * Invalid or missing values fall back to 'students'.
 */
export function parseLeaderboardView(view?: string | null): LeaderboardView {
  if (view === "teams") {
    return "teams";
  }
  if (view === "departments") {
    return "departments";
  }
  return DEFAULT_LEADERBOARD_VIEW;
}

/**
 * Helper to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${n}st`;
  }
  if (mod10 === 2 && mod100 !== 12) {
    return `${n}nd`;
  }
  if (mod10 === 3 && mod100 !== 13) {
    return `${n}rd`;
  }
  return `${n}th`;
}

/**
 * Dynamically generates the scoring legend text from the config.
 * E.g. "1st = 5 pts - 2nd = 3 pts - 3rd = 1 pt"
 */
export function getScoringLegendText(
  pointsConfig: Readonly<Record<number, number>> = LEADERBOARD_POINTS,
  separator: string = " - "
): string {
  const sortedPositions = Object.keys(pointsConfig)
    .map(Number)
    .sort((a, b) => a - b);

  return sortedPositions
    .map((pos) => {
      const pts = pointsConfig[pos];
      const unit = pts === 1 ? "pt" : "pts";
      return `${getOrdinalSuffix(pos)} = ${pts} ${unit}`;
    })
    .join(separator);
}

export interface MemberPreviewResult<T> {
  visible: T[];
  hiddenCount: number;
}

/**
 * Pure helper for previewing team member chips with a maximum count.
 * Returns up to `max` items in `visible` and the remaining count in `hiddenCount`.
 */
export function getMemberPreview<T>(
  members: readonly T[] | T[] = [],
  max = 3
): MemberPreviewResult<T> {
  if (!Array.isArray(members) || members.length === 0) {
    return { visible: [], hiddenCount: 0 };
  }
  const safeMax = Math.max(0, max);
  if (members.length <= safeMax) {
    return { visible: [...members], hiddenCount: 0 };
  }
  return {
    visible: members.slice(0, safeMax),
    hiddenCount: members.length - safeMax,
  };
}

/**
 * Pure helper to compute grid layout class for leaderboard breakdown list.
 * columns === 1 guarantees a strict single-column layout across all viewports.
 * columns === 2 or undefined defaults to 1 col on mobile, 2 cols from sm breakpoint up.
 */
export function getBreakdownGridClass(
  columns?: 1 | 2,
  customGridClass?: string
): string {
  if (customGridClass) return customGridClass;
  return columns === 1
    ? "grid grid-cols-1 gap-2.5"
    : "grid grid-cols-1 sm:grid-cols-2 gap-2.5";
}

