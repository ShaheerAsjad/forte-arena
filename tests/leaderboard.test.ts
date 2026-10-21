import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  LEADERBOARD_POINTS,
  getScoringLegendText,
  parseLeaderboardView,
  getOrdinalSuffix,
} from "@/features/leaderboard/leaderboard.config";
import {
  aggregateStudentStandings,
  aggregateDepartmentStandings,
  buildLeaderboardData,
  getPersonStableKey,
  compareLeaderboardEntries,
  assignCompetitionRanks,
  normalizeDepartmentName,
} from "@/features/leaderboard/leaderboard.service";
import {
  getPodiumEntries,
  getPodiumAccent,
} from "@/features/leaderboard/leaderboard.podium";
import type { RawLeaderboardResultItem } from "@/features/leaderboard/repositories/leaderboard.repository";

describe("Leaderboard Config & Legend", () => {
  it("provides correct point values from LEADERBOARD_POINTS", () => {
    expect(LEADERBOARD_POINTS[1]).toBe(5);
    expect(LEADERBOARD_POINTS[2]).toBe(3);
    expect(LEADERBOARD_POINTS[3]).toBe(1);
    expect(LEADERBOARD_POINTS[4]).toBeUndefined();
  });

  it("formats ordinal suffixes correctly", () => {
    expect(getOrdinalSuffix(1)).toBe("1st");
    expect(getOrdinalSuffix(2)).toBe("2nd");
    expect(getOrdinalSuffix(3)).toBe("3rd");
    expect(getOrdinalSuffix(4)).toBe("4th");
    expect(getOrdinalSuffix(11)).toBe("11th");
    expect(getOrdinalSuffix(21)).toBe("21st");
  });

  it("generates scoring legend dynamically from config", () => {
    const legend = getScoringLegendText(LEADERBOARD_POINTS);
    expect(legend).toBe("1st = 5 pts - 2nd = 3 pts - 3rd = 1 pt");

    // Custom separator and custom config
    const customConfig = { 1: 10, 2: 5, 3: 1 };
    expect(getScoringLegendText(customConfig, " · ")).toBe("1st = 10 pts · 2nd = 5 pts · 3rd = 1 pt");
  });

  it("parses leaderboard view param with fallback to students", () => {
    expect(parseLeaderboardView("departments")).toBe("departments");
    expect(parseLeaderboardView("students")).toBe("students");
    expect(parseLeaderboardView("invalid")).toBe("students");
    expect(parseLeaderboardView(null)).toBe("students");
    expect(parseLeaderboardView(undefined)).toBe("students");
  });
});

describe("Leaderboard Stable Person Key", () => {
  it("uses trimmed and uppercase roll number when present", () => {
    expect(
      getPersonStableKey({
        name: "Ahmad Raza",
        rollNumber: " cs-2023-014 ",
        userId: "user-123",
      })
    ).toBe("roll:CS-2023-014");
  });

  it("falls back to userId if roll number is absent", () => {
    expect(
      getPersonStableKey({
        name: "Fatima Noor",
        rollNumber: null,
        userId: "user-456",
      })
    ).toBe("user:user-456");
  });

  it("falls back to normalized name if both roll number and userId are absent", () => {
    expect(
      getPersonStableKey({
        name: "  Walk-in Champion  ",
        rollNumber: null,
        userId: null,
      })
    ).toBe("name:walk-in champion");
  });
});

describe("Leaderboard Pure Ranking Logic", () => {
  const baseEvent = {
    id: "ev-1",
    slug: "hackathon-2026",
    title: "Annual Hackathon",
    category: "TECHNICAL" as const,
    startsAt: new Date("2026-10-10"),
    resultsPublished: true,
  };

  it("handles empty input safely", () => {
    const data = buildLeaderboardData([]);
    expect(data.students).toEqual([]);
    expect(data.departments).toEqual([]);
    expect(data.totalPublishedEvents).toBe(0);
  });

  it("excludes unpublished results", () => {
    const unpublishedResult: RawLeaderboardResultItem = {
      id: "res-unpub",
      position: 1,
      award: "Champion",
      teamName: null,
      event: {
        ...baseEvent,
        resultsPublished: false,
      },
      participants: [
        {
          name: "Secret Winner",
          rollNumber: "CS-999",
          department: "Computer Science",
        },
      ],
    };

    const students = aggregateStudentStandings([unpublishedResult]);
    const depts = aggregateDepartmentStandings([unpublishedResult]);

    expect(students).toHaveLength(0);
    expect(depts).toHaveLength(0);
  });

  it("gives points per position from the config and ignores position 4+", () => {
    const results: RawLeaderboardResultItem[] = [
      {
        id: "res-1",
        position: 1,
        award: "Gold",
        teamName: null,
        event: baseEvent,
        participants: [{ name: "Alice", rollNumber: "CS-1", department: "CS" }],
      },
      {
        id: "res-2",
        position: 2,
        award: "Silver",
        teamName: null,
        event: baseEvent,
        participants: [{ name: "Bob", rollNumber: "EE-1", department: "EE" }],
      },
      {
        id: "res-3",
        position: 3,
        award: "Bronze",
        teamName: null,
        event: baseEvent,
        participants: [{ name: "Charlie", rollNumber: "ME-1", department: "ME" }],
      },
      {
        id: "res-4",
        position: 4,
        award: "Honorable Mention",
        teamName: null,
        event: baseEvent,
        participants: [{ name: "David", rollNumber: "AI-1", department: "AI" }],
      },
    ];

    const students = aggregateStudentStandings(results);
    expect(students).toHaveLength(3); // Position 4 has 0 points and is omitted
    expect(students.find((s) => s.name === "Alice")?.totalPoints).toBe(5);
    expect(students.find((s) => s.name === "Bob")?.totalPoints).toBe(3);
    expect(students.find((s) => s.name === "Charlie")?.totalPoints).toBe(1);
    expect(students.find((s) => s.name === "David")).toBeUndefined();
  });

  it("team result gives EVERY member the full points of that position", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "Champions",
      teamName: "CodeNinjas",
      event: baseEvent,
      participants: [
        { name: "Alice", rollNumber: "CS-001", department: "Computer Science" },
        { name: "Bob", rollNumber: "CS-002", department: "Computer Science" },
        { name: "Charlie", rollNumber: "EE-001", department: "Electrical Engineering" },
      ],
    };

    const students = aggregateStudentStandings([teamResult]);
    expect(students).toHaveLength(3);

    for (const s of students) {
      expect(s.totalPoints).toBe(5);
      expect(s.firstCount).toBe(1);
      expect(s.breakdown).toHaveLength(1);
      expect(s.breakdown[0].teamName).toBe("CodeNinjas");
      expect(s.breakdown[0].points).toBe(5);
    }
  });

  it("aggregates the same person across several events using their stable key", () => {
    const event2 = {
      id: "ev-2",
      slug: "chess-2026",
      title: "Chess Masters",
      category: "ACADEMIC" as const,
      startsAt: new Date("2026-10-12"),
      resultsPublished: true,
    };

    const results: RawLeaderboardResultItem[] = [
      // Event 1: Solo 1st place (5 pts)
      {
        id: "res-solo-1",
        position: 1,
        award: "Hackathon Winner",
        teamName: null,
        event: baseEvent,
        participants: [
          { name: "Ahmad Raza", rollNumber: "CS-2023-014", department: "Computer Science" },
        ],
      },
      // Event 2: Team 3rd place (1 pt) - note different case and whitespace in roll number
      {
        id: "res-team-2",
        position: 3,
        award: "Bronze Trophy",
        teamName: "RoboKnights",
        event: event2,
        participants: [
          { name: "Ahmad Raza", rollNumber: " cs-2023-014 ", department: "Computer Science" },
          { name: "Hamza Ali", rollNumber: "ME-2023-005", department: "Mechanical Engineering" },
        ],
      },
    ];

    const students = aggregateStudentStandings(results);
    const ahmad = students.find((s) => s.name === "Ahmad Raza");

    expect(ahmad).toBeDefined();
    expect(ahmad?.totalPoints).toBe(6); // 5 + 1
    expect(ahmad?.firstCount).toBe(1);
    expect(ahmad?.thirdCount).toBe(1);
    expect(ahmad?.breakdown).toHaveLength(2);
    expect(ahmad?.breakdown.map((b) => b.eventSlug)).toContain("hackathon-2026");
    expect(ahmad?.breakdown.map((b) => b.eventSlug)).toContain("chess-2026");
  });

  it("departments view: gives points ONCE to each distinct department among participants, ignoring participants without department", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "First Place",
      teamName: "MultiDeptSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "CS-1", department: "Computer Science" },
        { name: "Student 2", rollNumber: "CS-2", department: "Computer Science" },
        { name: "Student 3", rollNumber: "EE-1", department: "Electrical Engineering" },
        { name: "Student 4 (External)", rollNumber: "EXT-1", department: null },
      ],
    };

    const depts = aggregateDepartmentStandings([teamResult]);
    expect(depts).toHaveLength(2); // CS and EE

    const cs = depts.find((d) => d.name === "Computer Science");
    const ee = depts.find((d) => d.name === "Electrical Engineering");

    // Computer Science gets 5 points ONCE (not 10 points)
    expect(cs?.totalPoints).toBe(5);
    expect(cs?.firstCount).toBe(1);
    expect(cs?.breakdown).toHaveLength(1);

    // Electrical Engineering gets 5 points ONCE
    expect(ee?.totalPoints).toBe(5);
    expect(ee?.firstCount).toBe(1);
  });

  it("enforces tie-break order: more 1st, then more 2nd, then more 3rd, then name A-Z", () => {
    // Both Alice and Bob have 6 points:
    // Alice has 1x 1st (5) + 1x 3rd (1) = 6 pts (1st: 1, 2nd: 0, 3rd: 1)
    // Bob has 2x 2nd (3 + 3) = 6 pts (1st: 0, 2nd: 2, 3rd: 0)
    // Alice should win the tie-break because she has more 1st places!
    const results: RawLeaderboardResultItem[] = [
      {
        id: "res-1",
        position: 1,
        award: "Gold",
        teamName: null,
        event: { ...baseEvent, id: "ev-a", slug: "event-a" },
        participants: [{ name: "Alice", rollNumber: "R-1", department: "CS" }],
      },
      {
        id: "res-2",
        position: 3,
        award: "Bronze",
        teamName: null,
        event: { ...baseEvent, id: "ev-b", slug: "event-b" },
        participants: [{ name: "Alice", rollNumber: "R-1", department: "CS" }],
      },
      {
        id: "res-3",
        position: 2,
        award: "Silver",
        teamName: null,
        event: { ...baseEvent, id: "ev-c", slug: "event-c" },
        participants: [{ name: "Bob", rollNumber: "R-2", department: "EE" }],
      },
      {
        id: "res-4",
        position: 2,
        award: "Silver",
        teamName: null,
        event: { ...baseEvent, id: "ev-d", slug: "event-d" },
        participants: [{ name: "Bob", rollNumber: "R-2", department: "EE" }],
      },
    ];

    const students = aggregateStudentStandings(results);
    expect(students[0].name).toBe("Alice");
    expect(students[0].rank).toBe(1);
    expect(students[1].name).toBe("Bob");
    expect(students[1].rank).toBe(2);
  });

  it("assigns shared ranks with competition ranking (1, 2, 2, 4)", () => {
    // Test dataset:
    // Person 1: 10 points (Rank 1)
    // Person 2: 5 points, 1x 1st (Alice) -> Tied for Rank 2
    // Person 3: 5 points, 1x 1st (Bob) -> Tied for Rank 2
    // Person 4: 1 point, 1x 3rd (Charlie) -> Rank 4
    const entries = [
      { name: "Top Leader", totalPoints: 10, firstCount: 2, secondCount: 0, thirdCount: 0 },
      { name: "Alice", totalPoints: 5, firstCount: 1, secondCount: 0, thirdCount: 0 },
      { name: "Bob", totalPoints: 5, firstCount: 1, secondCount: 0, thirdCount: 0 },
      { name: "Charlie", totalPoints: 1, firstCount: 0, secondCount: 0, thirdCount: 1 },
    ];

    const sorted = [...entries].sort(compareLeaderboardEntries);
    const ranked = assignCompetitionRanks(sorted);

    expect(ranked[0].name).toBe("Top Leader");
    expect(ranked[0].rank).toBe(1);

    expect(ranked[1].name).toBe("Alice");
    expect(ranked[1].rank).toBe(2);

    expect(ranked[2].name).toBe("Bob");
    expect(ranked[2].rank).toBe(2); // Shared rank 2

    expect(ranked[3].name).toBe("Charlie");
    expect(ranked[3].rank).toBe(4); // Competition ranking skips to 4!
  });

  it("safely handles participants without roll number", () => {
    const result: RawLeaderboardResultItem = {
      id: "res-no-roll",
      position: 1,
      award: "Guest Champion",
      teamName: null,
      event: baseEvent,
      participants: [
        {
          name: "Walk-in Star",
          rollNumber: null,
          department: null,
        },
      ],
    };

    const students = aggregateStudentStandings([result]);
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe("Walk-in Star");
    expect(students[0].rollNumber).toBeNull();
    expect(students[0].totalPoints).toBe(5);
    expect(students[0].rank).toBe(1);
  });

  it("groups departments case-insensitively after trimming and collapsing repeated whitespace, and displays first-seen spelling", () => {
    expect(normalizeDepartmentName("  computer   science  ")).toBe("computer science");
    expect(normalizeDepartmentName("COMPUTER\tSCIENCE")).toBe("computer science");

    const eventA = { ...baseEvent, id: "ev-a", slug: "event-a" };
    const eventB = { ...baseEvent, id: "ev-b", slug: "event-b" };

    const results: RawLeaderboardResultItem[] = [
      // Event 1: Team with "Computer Science" (first-seen spelling) wins 1st (5 pts)
      {
        id: "res-1",
        position: 1,
        award: "Gold",
        teamName: "Team 1",
        event: eventA,
        participants: [
          { name: "Alice", rollNumber: "R-1", department: "Computer Science" },
        ],
      },
      // Event 2: Team with "  computer   science  " wins 2nd (3 pts)
      {
        id: "res-2",
        position: 2,
        award: "Silver",
        teamName: "Team 2",
        event: eventB,
        participants: [
          { name: "Bob", rollNumber: "R-2", department: "  computer   science  " },
        ],
      },
    ];

    const depts = aggregateDepartmentStandings(results);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe("Computer Science"); // Preserved first-seen display spelling!
    expect(depts[0].totalPoints).toBe(8); // 5 + 3
    expect(depts[0].firstCount).toBe(1);
    expect(depts[0].secondCount).toBe(1);
    expect(depts[0].breakdown).toHaveLength(2);
  });
});

describe("Leaderboard Podium Entries & Accents", () => {
  it("handles empty list", () => {
    expect(getPodiumEntries([])).toEqual([]);
  });

  it("handles one entry", () => {
    const list = [{ name: "Alice", rank: 1 }];
    expect(getPodiumEntries(list)).toEqual([{ name: "Alice", rank: 1 }]);
  });

  it("handles two entries", () => {
    const list = [
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
    ];
    expect(getPodiumEntries(list)).toEqual([
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
    ]);
  });

  it("handles ties at rank 1 (e.g. ranks [1, 1, 3])", () => {
    const list = [
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 1 },
      { name: "Charlie", rank: 3 },
      { name: "David", rank: 4 },
    ];
    const podium = getPodiumEntries(list);
    expect(podium).toHaveLength(3);
    expect(podium[0]).toEqual({ name: "Alice", rank: 1 });
    expect(podium[1]).toEqual({ name: "Bob", rank: 1 });
    expect(podium[2]).toEqual({ name: "Charlie", rank: 3 });

    expect(getPodiumAccent(podium[0].rank)).toBe("gold");
    expect(getPodiumAccent(podium[1].rank)).toBe("gold");
    expect(getPodiumAccent(podium[2].rank)).toBe("bronze");
  });

  it("handles ties at rank 2 (e.g. ranks [1, 2, 2])", () => {
    const list = [
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
      { name: "Charlie", rank: 2 },
      { name: "David", rank: 4 },
    ];
    const podium = getPodiumEntries(list);
    expect(podium).toHaveLength(3);
    expect(podium[0]).toEqual({ name: "Alice", rank: 1 });
    expect(podium[1]).toEqual({ name: "Bob", rank: 2 });
    expect(podium[2]).toEqual({ name: "Charlie", rank: 2 });

    expect(getPodiumAccent(podium[0].rank)).toBe("gold");
    expect(getPodiumAccent(podium[1].rank)).toBe("silver");
    expect(getPodiumAccent(podium[2].rank)).toBe("silver");
  });
});
