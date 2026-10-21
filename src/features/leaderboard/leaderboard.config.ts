/**
 * Leaderboard Configuration & Scoring Rules
 */

export const LEADERBOARD_POINTS: Readonly<Record<number, number>> = Object.freeze({
  1: 5,
  2: 3,
  3: 1,
});

export type LeaderboardView = "students" | "departments";

export const DEFAULT_LEADERBOARD_VIEW: LeaderboardView = "students";

/**
 * Validates and normalizes the leaderboard view param.
 * Invalid or missing values fall back to 'students'.
 */
export function parseLeaderboardView(view?: string | null): LeaderboardView {
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
