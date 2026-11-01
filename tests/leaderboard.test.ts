import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    result: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  LEADERBOARD_POINTS,
  getScoringLegendText,
  parseLeaderboardView,
  getOrdinalSuffix,
  getMemberPreview,
} from "@/features/leaderboard/leaderboard.config";
import {
  aggregateStudentStandings,
  aggregateTeamStandings,
  aggregateDepartmentStandings,
  buildLeaderboardData,
  getPersonStableKey,
  compareLeaderboardEntries,
  assignCompetitionRanks,
  normalizeDepartmentName,
  normalizeTeamName,
} from "@/features/leaderboard/leaderboard.service";
import {
  getPodiumEntries,
  getPodiumAccent,
} from "@/features/leaderboard/leaderboard.podium";
import {
  LeaderboardRepository,
  type RawLeaderboardResultItem,
} from "@/features/leaderboard/repositories/leaderboard.repository";
import {
  DEPARTMENTS,
  YEARS,
  isValidDepartment,
  isValidDepartmentCode,
  isValidYear,
  isValidYearCode,
  getDepartmentLabel,
  getYearLabel,
  resolveDepartmentLabel,
  sanitizeAcademicFields,
} from "@/features/profile/academic.config";
import { buildProfileUpdateData } from "@/features/users/profile.update";

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
    expect(parseLeaderboardView("teams")).toBe("teams");
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
        name: "Test Student 1",
        rollNumber: " cs-2023-014 ",
        userId: "user-123",
      })
    ).toBe("roll:CS-2023-014");
  });

  it("falls back to userId if roll number is absent", () => {
    expect(
      getPersonStableKey({
        name: "Test Student 2",
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
    expect(data.teams).toEqual([]);
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

  it("team result gives points to Teams standing and excludes members from students", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "CodeNinjas",
      event: baseEvent,
      participants: [
        { name: "Alice", rollNumber: "CS-001", department: "ICS" },
        { name: "Bob", rollNumber: "CS-002", department: "ICS" },
        { name: "Charlie", rollNumber: "EE-001", department: "ICS" },
      ],
    };

    const students = aggregateStudentStandings([teamResult]);
    expect(students).toHaveLength(0); // Team members not in students!

    const teams = aggregateTeamStandings([teamResult]);
    expect(teams).toHaveLength(1);
    expect(teams[0].teamName).toBe("CodeNinjas");
    expect(teams[0].totalPoints).toBe(5);
    expect(teams[0].firstCount).toBe(1);
    expect(teams[0].members).toHaveLength(3);
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
          { name: "Test Student 1", rollNumber: "CS-2023-014", department: "Computer Science" },
        ],
      },
      // Event 2: Solo 3rd place (1 pt) - note different case and whitespace in roll number
      {
        id: "res-solo-2",
        position: 3,
        award: "Bronze Trophy",
        isTeam: false,
        teamName: null,
        event: event2,
        participants: [
          { name: "Test Student 1", rollNumber: " cs-2023-014 ", department: "ICS" },
        ],
      },
    ];

    const students = aggregateStudentStandings(results);
    const student1 = students.find((s) => s.name === "Test Student 1");

    expect(student1).toBeDefined();
    expect(student1?.totalPoints).toBe(6); // 5 + 1
    expect(student1?.firstCount).toBe(1);
    expect(student1?.thirdCount).toBe(1);
    expect(student1?.breakdown).toHaveLength(2);
    expect(student1?.breakdown.map((b) => b.eventSlug)).toContain("hackathon-2026");
    expect(student1?.breakdown.map((b) => b.eventSlug)).toContain("chess-2026");
  });

  it("departments view: gives points only when all team members share the same valid department", () => {
    const teamResultSame: RawLeaderboardResultItem = {
      id: "res-team-same",
      position: 1,
      award: "First Place",
      isTeam: true,
      teamName: "SameDeptSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "CS-1", department: "ICS" },
        { name: "Student 2", rollNumber: "CS-2", department: "ICS" },
      ],
    };

    const teamResultMixed: RawLeaderboardResultItem = {
      id: "res-team-mixed",
      position: 1,
      award: "First Place",
      isTeam: true,
      teamName: "MultiDeptSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "CS-1", department: "ICS" },
        { name: "Student 2", rollNumber: "EE-1", department: "FSC_PRE_ENGINEERING" },
      ],
    };

    const deptsSame = aggregateDepartmentStandings([teamResultSame]);
    expect(deptsSame).toHaveLength(1);
    expect(deptsSame[0].name).toBe("ICS");
    expect(deptsSame[0].totalPoints).toBe(5);

    const deptsMixed = aggregateDepartmentStandings([teamResultMixed]);
    expect(deptsMixed).toHaveLength(0); // Mixed departments do not credit any department
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
      // Event 1: Solo with "FSc Pre-Engineering" (first-seen spelling) wins 1st (5 pts)
      {
        id: "res-1",
        position: 1,
        award: "Gold",
        isTeam: false,
        teamName: null,
        event: eventA,
        participants: [
          { name: "Alice", rollNumber: "R-1", department: "FSc Pre-Engineering" },
        ],
      },
      // Event 2: Solo with "  fsc pre-engineering  " wins 2nd (3 pts)
      {
        id: "res-2",
        position: 2,
        award: "Silver",
        isTeam: false,
        teamName: null,
        event: eventB,
        participants: [
          { name: "Bob", rollNumber: "R-2", department: "  fsc pre-engineering  " },
        ],
      },
    ];

    const depts = aggregateDepartmentStandings(results);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe("FSc Pre-Engineering"); // Preserved first-seen display spelling!
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

describe("Academic Config - DEPARTMENTS & YEARS", () => {
  it("defines canonical DEPARTMENTS with exact codes and labels", () => {
    expect(DEPARTMENTS).toEqual([
      { value: "ICS", label: "ICS" },
      { value: "FSC_PRE_ENGINEERING", label: "FSc Pre-Engineering" },
      { value: "FSC_PRE_MEDICAL", label: "FSc Pre-Medical" },
      { value: "ARTS", label: "Arts" },
    ]);
  });

  it("defines canonical YEARS with exact codes and labels", () => {
    expect(YEARS).toEqual([
      { value: "FIRST_YEAR", label: "First Year" },
      { value: "SECOND_YEAR", label: "Second Year" },
    ]);
  });

  it("validates departments and rejects old free-text or university codes", () => {
    expect(isValidDepartment("ICS")).toBe(true);
    expect(isValidDepartment("FSC_PRE_ENGINEERING")).toBe(true);
    expect(isValidDepartment("FSC_PRE_MEDICAL")).toBe(true);
    expect(isValidDepartment("ARTS")).toBe(true);
    expect(isValidDepartment("FSc Pre-Engineering")).toBe(true);

    // Rejects old free-text, university codes, null, empty
    expect(isValidDepartment("Computer Science")).toBe(false);
    expect(isValidDepartment("fsc pre medical")).toBe(false);
    expect(isValidDepartment("CS")).toBe(false);
    expect(isValidDepartment("SE")).toBe(false);
    expect(isValidDepartment("EE")).toBe(false);
    expect(isValidDepartment("BBA")).toBe(false);
    expect(isValidDepartment(null)).toBe(false);
    expect(isValidDepartment(undefined)).toBe(false);
    expect(isValidDepartment("")).toBe(false);

    // Exact code validation (rejects labels, free text, null)
    expect(isValidDepartmentCode("ICS")).toBe(true);
    expect(isValidDepartmentCode("FSC_PRE_MEDICAL")).toBe(true);
    expect(isValidDepartmentCode("FSc Pre-Medical")).toBe(false);
    expect(isValidDepartmentCode("Computer Science")).toBe(false);
    expect(isValidDepartmentCode(null)).toBe(false);
  });

  it("validates academic years and rejects invalid codes or text", () => {
    expect(isValidYear("FIRST_YEAR")).toBe(true);
    expect(isValidYear("SECOND_YEAR")).toBe(true);
    expect(isValidYear("First Year")).toBe(true);
    expect(isValidYear("Second Year")).toBe(true);

    expect(isValidYear("THIRD_YEAR")).toBe(false);
    expect(isValidYear("Freshman")).toBe(false);
    expect(isValidYear("")).toBe(false);
    expect(isValidYear(null)).toBe(false);
    expect(isValidYear(undefined)).toBe(false);

    // Exact year code validation (rejects labels, free text, null)
    expect(isValidYearCode("FIRST_YEAR")).toBe(true);
    expect(isValidYearCode("SECOND_YEAR")).toBe(true);
    expect(isValidYearCode("First Year")).toBe(false);
    expect(isValidYearCode("Freshman")).toBe(false);
    expect(isValidYearCode(null)).toBe(false);
  });

  it("converts department codes to canonical labels and returns null for unknown", () => {
    expect(getDepartmentLabel("ICS")).toBe("ICS");
    expect(getDepartmentLabel("FSC_PRE_ENGINEERING")).toBe("FSc Pre-Engineering");
    expect(getDepartmentLabel("FSC_PRE_MEDICAL")).toBe("FSc Pre-Medical");
    expect(getDepartmentLabel("ARTS")).toBe("Arts");

    // Unknown or invalid codes return null
    expect(getDepartmentLabel("Computer Science")).toBeNull();
    expect(getDepartmentLabel("unknown")).toBeNull();
    expect(getDepartmentLabel(null)).toBeNull();
  });

  it("converts year codes to canonical labels and returns null for unknown", () => {
    expect(getYearLabel("FIRST_YEAR")).toBe("First Year");
    expect(getYearLabel("SECOND_YEAR")).toBe("Second Year");

    // Unknown or invalid codes return null
    expect(getYearLabel("THIRD_YEAR")).toBeNull();
    expect(getYearLabel("First Year")).toBeNull();
    expect(getYearLabel(null)).toBeNull();
  });

  it("resolves valid departments to display labels and returns null for invalid", () => {
    expect(resolveDepartmentLabel("ICS")).toBe("ICS");
    expect(resolveDepartmentLabel("FSC_PRE_ENGINEERING")).toBe("FSc Pre-Engineering");
    expect(resolveDepartmentLabel("FSC_PRE_MEDICAL")).toBe("FSc Pre-Medical");
    expect(resolveDepartmentLabel("ARTS")).toBe("Arts");
    expect(resolveDepartmentLabel("FSc Pre-Engineering")).toBe("FSc Pre-Engineering");

    // Invalid / old free-text
    expect(resolveDepartmentLabel("Computer Science")).toBeNull();
    expect(resolveDepartmentLabel("fsc pre medical")).toBeNull();
    expect(resolveDepartmentLabel("Mechanical Engineering")).toBeNull();
    expect(resolveDepartmentLabel("CS")).toBeNull();
    expect(resolveDepartmentLabel(null)).toBeNull();
  });

  it("sanitizes academic fields keeping only valid codes", () => {
    // Valid codes kept as-is
    expect(
      sanitizeAcademicFields({
        department: "ICS",
        academicYear: "FIRST_YEAR",
      })
    ).toEqual({
      department: "ICS",
      academicYear: "FIRST_YEAR",
    });

    // Old free text, labels, or university codes mapped to null
    expect(
      sanitizeAcademicFields({
        department: "Computer Science",
        academicYear: "Freshman",
      })
    ).toEqual({
      department: null,
      academicYear: null,
    });

    // Display labels (not codes) mapped to null
    expect(
      sanitizeAcademicFields({
        department: "FSc Pre-Medical",
        academicYear: "First Year",
      })
    ).toEqual({
      department: null,
      academicYear: null,
    });

    // Empty or missing inputs
    expect(sanitizeAcademicFields({})).toEqual({
      department: null,
      academicYear: null,
    });
    expect(sanitizeAcademicFields(null)).toEqual({
      department: null,
      academicYear: null,
    });
  });
});

describe("Profile Update Data Builder", () => {
  it("includes department and academicYear when valid codes are provided", () => {
    const updateData = buildProfileUpdateData({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: "ICS",
      academicYear: "FIRST_YEAR",
    });

    expect(updateData).toEqual({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: "ICS",
      academicYear: "FIRST_YEAR",
    });
  });

  it("does not include department or academicYear in update data when undefined (leaves stored values untouched)", () => {
    const updateData = buildProfileUpdateData({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: undefined,
      academicYear: undefined,
    });

    expect(updateData).toEqual({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
    });
    expect("department" in updateData).toBe(false);
    expect("academicYear" in updateData).toBe(false);
  });

  it("sets department and academicYear to null when explicitly passed empty string or null (clears them)", () => {
    const updateDataWithEmpty = buildProfileUpdateData({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: "",
      academicYear: "",
    });

    expect(updateDataWithEmpty).toEqual({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: null,
      academicYear: null,
    });

    const updateDataWithNull = buildProfileUpdateData({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: null,
      academicYear: null,
    });

    expect(updateDataWithNull).toEqual({
      rollNumber: "2021-CS-001",
      phone: "+92 300 1234567",
      department: null,
      academicYear: null,
    });
  });
});

describe("Leaderboard Repository Department Sanitization", () => {
  it("treats stored departments not in DEPARTMENTS as unspecified (null) in repository output", async () => {
    const mockPrisma = prisma as unknown as {
      result: { findMany: ReturnType<typeof vi.fn> };
      user: { findMany: ReturnType<typeof vi.fn> };
    };

    mockPrisma.result.findMany.mockResolvedValueOnce([
      // 1. User with old free-text "Computer Science"
      {
        id: "res-1",
        position: 1,
        award: "Champion",
        customParticipantName: null,
        event: {
          id: "ev-1",
          slug: "event-1",
          title: "Code Sprint",
          category: "TECHNICAL",
          startsAt: new Date("2026-10-10"),
          resultsPublished: true,
        },
        registration: {
          id: "reg-1",
          user: {
            id: "u-1",
            name: "Test Student 3",
            rollNumber: "CS-101",
            department: "Computer Science", // Old free-text
          },
          team: null,
        },
      },
      // 2. User with old free-text "fsc pre medical"
      {
        id: "res-2",
        position: 2,
        award: "Runner-Up",
        customParticipantName: null,
        event: {
          id: "ev-1",
          slug: "event-1",
          title: "Code Sprint",
          category: "TECHNICAL",
          startsAt: new Date("2026-10-10"),
          resultsPublished: true,
        },
        registration: {
          id: "reg-2",
          user: {
            id: "u-2",
            name: "Test Student 4",
            rollNumber: "MED-202",
            department: "fsc pre medical", // Old free-text
          },
          team: null,
        },
      },
      // 3. User with valid department "FSC_PRE_ENGINEERING"
      {
        id: "res-3",
        position: 3,
        award: "Third Place",
        customParticipantName: null,
        event: {
          id: "ev-1",
          slug: "event-1",
          title: "Code Sprint",
          category: "TECHNICAL",
          startsAt: new Date("2026-10-10"),
          resultsPublished: true,
        },
        registration: {
          id: "reg-3",
          user: {
            id: "u-3",
            name: "Test Student 5",
            rollNumber: "ENG-303",
            department: "FSC_PRE_ENGINEERING", // Valid code
          },
          team: null,
        },
      },
      // 4. Team with leader having valid "ICS" and member with old free-text "Mechanical Engineering"
      {
        id: "res-4",
        position: 1,
        award: "Champion",
        customParticipantName: null,
        event: {
          id: "ev-2",
          slug: "event-2",
          title: "Robo Wars",
          category: "TECHNICAL",
          startsAt: new Date("2026-10-11"),
          resultsPublished: true,
        },
        registration: {
          id: "reg-4",
          user: {
            id: "u-lead",
            name: "Team Lead",
            rollNumber: "ICS-001",
            department: "ICS",
          },
          team: {
            id: "team-1",
            name: "RoboStars",
            leader: {
              id: "u-lead",
              name: "Team Lead",
              rollNumber: "ICS-001",
              department: "ICS", // Valid code
            },
            members: [
              {
                id: "tm-lead",
                fullName: "Team Lead",
                rollNumber: "ICS-001",
                email: "lead@test.com",
              },
              {
                id: "tm-1",
                fullName: "Member One",
                rollNumber: "OLD-999",
                email: "member1@test.com",
              },
            ],
          },
        },
      },
    ]);

    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: "u-lead",
        name: "Team Lead",
        rollNumber: "ICS-001",
        email: "lead@test.com",
        department: "ICS", // Valid code
      },
      {
        id: "u-mem",
        name: "Member One",
        rollNumber: "OLD-999",
        email: "member1@test.com",
        department: "Mechanical Engineering", // Old free-text
      },
    ]);

    const results = await LeaderboardRepository.getPublishedResults();

    expect(results).toHaveLength(4);

    // Old free-text "Computer Science" -> department is null
    expect(results[0].participants[0].department).toBeNull();
    expect(results[0].participants[0].name).toBe("Test Student 3");

    // Old free-text "fsc pre medical" -> department is null
    expect(results[1].participants[0].department).toBeNull();
    expect(results[1].participants[0].name).toBe("Test Student 4");

    // Valid "FSC_PRE_ENGINEERING" -> department is "FSc Pre-Engineering"
    expect(results[2].participants[0].department).toBe("FSc Pre-Engineering");
    expect(results[2].participants[0].name).toBe("Test Student 5");

    // Find participants by name and assert BOTH team leader (valid "ICS" -> "ICS") and member with old free-text (-> null)
    const teamLeader = results[3].participants.find((p) => p.name === "Team Lead");
    const teamMember = results[3].participants.find((p) => p.name === "Member One");

    expect(teamLeader).toBeDefined();
    expect(teamLeader?.department).toBe("ICS");

    expect(teamMember).toBeDefined();
    expect(teamMember?.department).toBeNull();
  });
});

describe("Task B - Team Points as One Unit & Leaderboard Rework", () => {
  const baseEvent = {
    id: "ev-1",
    slug: "hackathon-2026",
    title: "Annual Hackathon",
    category: "TECHNICAL" as const,
    startsAt: new Date("2026-10-10"),
    resultsPublished: true,
  };

  const event2 = {
    id: "ev-2",
    slug: "robo-wars-2026",
    title: "Robo Wars",
    category: "TECHNICAL" as const,
    startsAt: new Date("2026-10-15"),
    resultsPublished: true,
  };

  it("solo win -> students only (not in teams)", () => {
    const soloResult: RawLeaderboardResultItem = {
      id: "res-solo",
      position: 1,
      award: "Champion",
      isTeam: false,
      teamName: null,
      event: baseEvent,
      participants: [{ name: "Test Student 1", rollNumber: "ICS-001", department: "ICS" }],
    };

    const data = buildLeaderboardData([soloResult]);
    expect(data.students).toHaveLength(1);
    expect(data.students[0].name).toBe("Test Student 1");
    expect(data.students[0].totalPoints).toBe(5);

    expect(data.teams).toHaveLength(0);

    expect(data.departments).toHaveLength(1);
    expect(data.departments[0].name).toBe("ICS");
    expect(data.departments[0].totalPoints).toBe(5);
  });

  it("team win -> teams only and NOT in students", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "CodeNinjas",
      event: baseEvent,
      participants: [
        { name: "Alice", rollNumber: "ICS-001", department: "ICS" },
        { name: "Bob", rollNumber: "ICS-002", department: "ICS" },
        { name: "Charlie", rollNumber: "ICS-003", department: "ICS" },
      ],
    };

    const data = buildLeaderboardData([teamResult]);

    // Team members must NOT appear in students
    expect(data.students).toHaveLength(0);

    // Points go to the TEAM as one unit
    expect(data.teams).toHaveLength(1);
    expect(data.teams[0].teamName).toBe("CodeNinjas");
    expect(data.teams[0].totalPoints).toBe(5);
    expect(data.teams[0].firstCount).toBe(1);
    expect(data.teams[0].members).toHaveLength(3);
    expect(data.teams[0].members.map((m) => m.name)).toEqual(["Alice", "Bob", "Charlie"]);

    // Since all 3 members share "ICS", department gets 5 points
    expect(data.departments).toHaveLength(1);
    expect(data.departments[0].name).toBe("ICS");
    expect(data.departments[0].totalPoints).toBe(5);
  });

  it("the same squad with different case/spacing in two events merges into one row (first-seen display name)", () => {
    const results: RawLeaderboardResultItem[] = [
      {
        id: "res-1",
        position: 1,
        award: "Gold",
        isTeam: true,
        teamName: "Code Ninjas", // first seen
        event: baseEvent,
        participants: [
          { name: "Alice", rollNumber: "ICS-001", department: "ICS" },
          { name: "Bob", rollNumber: "ICS-002", department: "ICS" },
        ],
      },
      {
        id: "res-2",
        position: 2,
        award: "Silver",
        isTeam: true,
        teamName: "  code   ninjas  ", // different casing and whitespace
        event: event2,
        participants: [
          { name: "Alice", rollNumber: "ICS-001", department: "ICS" },
          { name: "Charlie", rollNumber: "ICS-003", department: "ICS" },
        ],
      },
    ];

    const teams = aggregateTeamStandings(results);
    expect(teams).toHaveLength(1);
    expect(teams[0].teamName).toBe("Code Ninjas");
    expect(teams[0].totalPoints).toBe(8); // 5 + 3
    expect(teams[0].firstCount).toBe(1);
    expect(teams[0].secondCount).toBe(1);
    expect(teams[0].breakdown).toHaveLength(2);
    // Members merged: Alice, Bob, Charlie
    expect(teams[0].members).toHaveLength(3);
    expect(teams[0].members.map((m) => m.name)).toContain("Alice");
    expect(teams[0].members.map((m) => m.name)).toContain("Bob");
    expect(teams[0].members.map((m) => m.name)).toContain("Charlie");
    expect(normalizeTeamName("  code   ninjas  ")).toBe("code ninjas");
  });

  it("department credited only when all members share one valid department", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "AllMedSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "MED-1", department: "FSC_PRE_MEDICAL" },
        { name: "Student 2", rollNumber: "MED-2", department: "FSc Pre-Medical" },
      ],
    };

    const depts = aggregateDepartmentStandings([teamResult]);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe("FSc Pre-Medical");
    expect(depts[0].totalPoints).toBe(5);
  });

  it("mixed departments -> team only (no department credited)", () => {
    const teamResult: RawLeaderboardResultItem = {
      id: "res-team",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "CrossDeptSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "ICS-1", department: "ICS" },
        { name: "Student 2", rollNumber: "ENG-1", department: "FSC_PRE_ENGINEERING" },
      ],
    };

    const data = buildLeaderboardData([teamResult]);
    expect(data.teams).toHaveLength(1);
    expect(data.teams[0].totalPoints).toBe(5);
    expect(data.departments).toHaveLength(0); // Not credited to any department!
  });

  it("missing or invalid department in a team member -> team only (no department credited)", () => {
    const teamWithMissingDept: RawLeaderboardResultItem = {
      id: "res-missing-dept",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "IncompleteSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "ICS-1", department: "ICS" },
        { name: "Student 2", rollNumber: "EXT-1", department: null },
      ],
    };

    const teamWithInvalidDept: RawLeaderboardResultItem = {
      id: "res-invalid-dept",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "InvalidDeptSquad",
      event: baseEvent,
      participants: [
        { name: "Student 1", rollNumber: "ICS-1", department: "ICS" },
        { name: "Student 2", rollNumber: "CS-1", department: "Computer Science" }, // Invalid/old free text
      ],
    };

    const data1 = buildLeaderboardData([teamWithMissingDept]);
    expect(data1.teams).toHaveLength(1);
    expect(data1.departments).toHaveLength(0);

    const data2 = buildLeaderboardData([teamWithInvalidDept]);
    expect(data2.teams).toHaveLength(1);
    expect(data2.departments).toHaveLength(0);
  });

  it("customParticipantName solo unchanged (solo entry, name only, no department)", () => {
    const walkInSolo: RawLeaderboardResultItem = {
      id: "res-walkin",
      position: 1,
      award: "Champion",
      isTeam: false,
      teamName: null,
      event: baseEvent,
      participants: [{ name: "Test Student Walkin", rollNumber: null, department: null }],
    };

    const data = buildLeaderboardData([walkInSolo]);
    expect(data.students).toHaveLength(1);
    expect(data.students[0].name).toBe("Test Student Walkin");
    expect(data.students[0].totalPoints).toBe(5);
    expect(data.students[0].department).toBeNull();

    expect(data.teams).toHaveLength(0);
    expect(data.departments).toHaveLength(0);
  });

  it("rank ties work properly for teams (competition ranking 1, 1, 3)", () => {
    const results: RawLeaderboardResultItem[] = [
      {
        id: "res-t1",
        position: 1,
        award: "Gold",
        isTeam: true,
        teamName: "Team Alpha",
        event: baseEvent,
        participants: [{ name: "Member A", rollNumber: "1", department: "ICS" }],
      },
      {
        id: "res-t2",
        position: 1,
        award: "Gold",
        isTeam: true,
        teamName: "Team Beta",
        event: event2,
        participants: [{ name: "Member B", rollNumber: "2", department: "ICS" }],
      },
      {
        id: "res-t3",
        position: 2,
        award: "Silver",
        isTeam: true,
        teamName: "Team Gamma",
        event: baseEvent,
        participants: [{ name: "Member C", rollNumber: "3", department: "ICS" }],
      },
    ];

    const teams = aggregateTeamStandings(results);
    expect(teams).toHaveLength(3);
    expect(teams[0].rank).toBe(1);
    expect(teams[1].rank).toBe(1); // Tied for rank 1
    expect(teams[2].rank).toBe(3); // Competition ranking skips to 3
  });

  it("a team's points are never duplicated across its members", () => {
    const largeTeamResult: RawLeaderboardResultItem = {
      id: "res-large-team",
      position: 1,
      award: "Champions",
      isTeam: true,
      teamName: "MegaSquad",
      event: baseEvent,
      participants: [
        { name: "P1", rollNumber: "1", department: "ICS" },
        { name: "P2", rollNumber: "2", department: "ICS" },
        { name: "P3", rollNumber: "3", department: "ICS" },
        { name: "P4", rollNumber: "4", department: "ICS" },
        { name: "P5", rollNumber: "5", department: "ICS" },
      ],
    };

    const data = buildLeaderboardData([largeTeamResult]);
    expect(data.teams).toHaveLength(1);
    expect(data.teams[0].totalPoints).toBe(5); // Not 25!
    expect(data.departments).toHaveLength(1);
    expect(data.departments[0].totalPoints).toBe(5); // Not 25!
    expect(data.students).toHaveLength(0); // 0 in students
  });
});

describe("getMemberPreview Helper", () => {
  it("returns empty visible array and 0 hiddenCount when members list is empty", () => {
    expect(getMemberPreview([])).toEqual({ visible: [], hiddenCount: 0 });
    expect(getMemberPreview(undefined as unknown as string[])).toEqual({
      visible: [],
      hiddenCount: 0,
    });
  });

  it("returns all members when count is less than or equal to max", () => {
    const members = [{ name: "Alice" }, { name: "Bob" }];
    expect(getMemberPreview(members, 3)).toEqual({
      visible: [{ name: "Alice" }, { name: "Bob" }],
      hiddenCount: 0,
    });

    const threeMembers = ["A", "B", "C"];
    expect(getMemberPreview(threeMembers, 3)).toEqual({
      visible: ["A", "B", "C"],
      hiddenCount: 0,
    });
  });

  it("truncates at max and returns proper hiddenCount when members exceed max", () => {
    const fiveMembers = ["M1", "M2", "M3", "M4", "M5"];
    expect(getMemberPreview(fiveMembers, 3)).toEqual({
      visible: ["M1", "M2", "M3"],
      hiddenCount: 2,
    });

    const tenMembers = Array.from({ length: 10 }, (_, i) => `Member ${i + 1}`);
    const preview = getMemberPreview(tenMembers, 3);
    expect(preview.visible).toHaveLength(3);
    expect(preview.visible).toEqual(["Member 1", "Member 2", "Member 3"]);
    expect(preview.hiddenCount).toBe(7);
  });

  it("handles custom max values including 0", () => {
    const members = ["A", "B", "C"];
    expect(getMemberPreview(members, 1)).toEqual({
      visible: ["A"],
      hiddenCount: 2,
    });
    expect(getMemberPreview(members, 0)).toEqual({
      visible: [],
      hiddenCount: 3,
    });
  });
});



