import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_CSV_HEADERS,
  buildAttendanceCsvRows,
  generateAttendanceCsv,
} from "@/features/attendance/attendance.csv";
import type { AttendanceParticipantItem } from "@/features/attendance/repositories/attendance.repository";

import {
  generateCheckInToken,
  evaluateCheckInEligibility,
  AttendanceService,
} from "@/features/attendance/services/attendance.service";
import {
  normalizeCheckInToken,
  isCheckInTokenFormatValid,
} from "@/features/attendance/attendance.schemas";
import {
  ATTENDANCE_ALLOWED_EVENT_STATUSES,
  isEventAttendanceAllowed,
  getEventNotOpenMessage,
  getEventNotOpenCardTitle,
  sortEventsForScanner,
} from "@/features/attendance/attendance.config";
import {
  AttendanceRepository,
  ParticipantTokenMatch,
} from "@/features/attendance/repositories/attendance.repository";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTime24 } from "@/lib/dates";
import { APP_TIMEZONE } from "@/config/app";

type MockRegistration = NonNullable<
  Awaited<ReturnType<typeof AttendanceRepository.findById>>
>;
type MockTeamMember = NonNullable<
  Awaited<ReturnType<typeof AttendanceRepository.findTeamMemberById>>
>;

type MockCountArgs = {
  where?: {
    attendanceMethod?: string | null;
    status?: string;
    attendedAt?: { not?: null } | null;
  };
};

type MockPrisma = {
  registration: {
    groupBy: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  teamMember: {
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

describe("Attendance Unit Tests: Token Generation & Normalization", () => {
  it("generates URL-safe tokens of exactly 32 characters matching base64url format", () => {
    const token = generateCheckInToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBe(32);
    expect(isCheckInTokenFormatValid(token)).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("produces unique unguessable tokens with zero collisions across 1,000 iterations", () => {
    const set = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      set.add(generateCheckInToken());
    }
    expect(set.size).toBe(count);
  });

  it("normalizes tokens by trimming leading/trailing spaces, newlines, and quotes", () => {
    const raw = generateCheckInToken();
    expect(normalizeCheckInToken(`   ${raw}   `)).toBe(raw);
    expect(normalizeCheckInToken(`\n\r\n${raw}\r\n`)).toBe(raw);
    expect(normalizeCheckInToken(`"${raw}"`)).toBe(raw);
    expect(normalizeCheckInToken(`'${raw}'`)).toBe(raw);
    expect(isCheckInTokenFormatValid(normalizeCheckInToken(`  ${raw}\n  `))).toBe(true);
  });

  it("rejects invalid token formats (wrong length, invalid characters, whitespace in middle)", () => {
    // Too short (31 chars)
    expect(isCheckInTokenFormatValid("a".repeat(31))).toBe(false);
    // Too long (33 chars)
    expect(isCheckInTokenFormatValid("a".repeat(33))).toBe(false);
    // Contains invalid characters
    expect(isCheckInTokenFormatValid("a".repeat(31) + "$")).toBe(false);
    expect(isCheckInTokenFormatValid("a".repeat(31) + "@")).toBe(false);
    // Contains space inside
    expect(isCheckInTokenFormatValid("a".repeat(15) + " " + "a".repeat(16))).toBe(false);
    // Empty or non-string
    expect(isCheckInTokenFormatValid("")).toBe(false);
  });
});

describe("Attendance Unit Tests: Event Status Gating (Part 2)", () => {
  it("exports ATTENDANCE_ALLOWED_EVENT_STATUSES allowing PUBLISHED and CLOSED", () => {
    expect(ATTENDANCE_ALLOWED_EVENT_STATUSES).toEqual(["PUBLISHED", "CLOSED"]);
    expect(isEventAttendanceAllowed("PUBLISHED")).toBe(true);
    expect(isEventAttendanceAllowed("CLOSED")).toBe(true);
  });

  it("blocks attendance for non-live statuses: DRAFT, COMPLETED, CANCELLED", () => {
    expect(isEventAttendanceAllowed("DRAFT")).toBe(false);
    expect(isEventAttendanceAllowed("COMPLETED")).toBe(false);
    expect(isEventAttendanceAllowed("CANCELLED")).toBe(false);
  });

  it("evaluateCheckInEligibility blocks check-in when event status is not allowed", () => {
    const baseRegistration = {
      id: "reg-1",
      eventId: "event-1",
      status: "APPROVED" as const,
      attendedAt: null,
      event: { title: "Coding Battle", status: "COMPLETED" as const },
      user: { name: "Sara Khan", rollNumber: "CS-10" },
      team: null,
    };

    const res = evaluateCheckInEligibility({
      registration: baseRegistration,
      targetEventId: "event-1",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("EVENT_NOT_OPEN");
    expect(res.message).toBe("This event has ended — attendance can no longer be recorded.");
  });
});

describe("Attendance Unit Tests: Check-In Evaluation Rules", () => {
  const baseRegistration = {
    id: "reg-123",
    eventId: "event-a",
    status: "APPROVED" as const,
    attendedAt: null,
    event: { title: "Hackathon 2026", status: "PUBLISHED" as const },
    user: { name: "Ahmed Khan", rollNumber: "CS-2023-042" },
    team: { name: "Byte Force" },
  };

  it("permits check-in for an approved registration of the selected event", () => {
    const res = evaluateCheckInEligibility({
      registration: baseRegistration,
      targetEventId: "event-a",
    });

    expect(res.success).toBe(true);
    expect(res.alreadyCheckedIn).toBe(false);
    expect(res.registration?.studentName).toBe("Ahmed Khan");
    expect(res.registration?.teamName).toBe("Byte Force");
  });

  it("is idempotent: repeat scan returns alreadyCheckedIn without failing or modifying state", () => {
    const pastAttendedTime = new Date("2026-10-18T09:30:00Z");
    const res = evaluateCheckInEligibility({
      registration: {
        ...baseRegistration,
        attendedAt: pastAttendedTime,
      },
      targetEventId: "event-a",
    });

    expect(res.success).toBe(true);
    expect(res.alreadyCheckedIn).toBe(true);
    expect(res.attendedAt).toEqual(pastAttendedTime);
    expect(res.message).toContain("Already checked in at");
  });

  it("rejects check-in if registration is pending", () => {
    const res = evaluateCheckInEligibility({
      registration: {
        ...baseRegistration,
        status: "PENDING" as const,
      },
      targetEventId: "event-a",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("NOT_APPROVED");
    expect(res.message).toContain("only approved participants");
  });

  it("rejects check-in if registration belongs to a different event", () => {
    const res = evaluateCheckInEligibility({
      registration: baseRegistration,
      targetEventId: "event-b",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("WRONG_EVENT");
    expect(res.message).toContain("Hackathon 2026");
  });

  it("rejects check-in if registration is null", () => {
    const res = evaluateCheckInEligibility({
      registration: null,
      targetEventId: "event-a",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("INVALID_CODE");
    expect(res.message).toContain("invalid QR code");
  });
});

describe("Attendance Unit Tests: Pass Ownership & Atomic Assignment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects pass access if the student is not the owner of the registration", async () => {
    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue({
      id: "reg-999",
      userId: "student-owner",
      eventId: "event-a",
      status: "APPROVED",
      checkInToken: "token-123",
      attendedAt: null,
      attendedById: null,
      teamId: null,
      event: {
        id: "event-a",
        slug: "hackathon",
        title: "Hackathon",
        venue: "Hall A",
        startsAt: new Date(),
        endsAt: null,
        status: "PUBLISHED",
      },
      user: {
        id: "student-owner",
        name: "Owner",
        email: "owner@test.com",
        rollNumber: "CS-001",
        department: "CS",
        phone: null,
      },
      team: null,
      attendedBy: null,
    } as unknown as MockRegistration);

    await expect(
      AttendanceService.getOrCreateStudentPass("reg-999", "imposter-student")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError if registration does not exist", async () => {
    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue(null);

    await expect(
      AttendanceService.getOrCreateStudentPass("non-existent-id", "user-123")
    ).rejects.toThrow(NotFoundError);
  });

  it("atomic token assignment: when assignRegistrationToken affects 0 rows (race), re-reads DB token", async () => {
    const committedDbToken = "already-committed-token-32chars";
    const initialRecord = {
      id: "reg-race-1",
      userId: "student-owner",
      eventId: "event-a",
      status: "APPROVED" as const,
      checkInToken: null,
      attendedAt: null,
      attendedById: null,
      teamId: null,
      event: {
        id: "event-a",
        slug: "hackathon",
        title: "Hackathon",
        venue: "Hall A",
        startsAt: new Date(),
        endsAt: null,
        status: "PUBLISHED" as const,
      },
      user: {
        id: "student-owner",
        name: "Owner",
        email: "owner@test.com",
        rollNumber: "CS-001",
        department: "CS",
        phone: null,
      },
      team: null,
      attendedBy: null,
    };

    const updatedRecord = {
      ...initialRecord,
      checkInToken: committedDbToken,
    };

    // First lookup has null token
    vi.spyOn(AttendanceRepository, "findById")
      .mockResolvedValueOnce(initialRecord as unknown as MockRegistration)
      .mockResolvedValueOnce(updatedRecord as unknown as MockRegistration);

    // Another request already won the race to set the token: updateMany updated 0 rows
    const assignSpy = vi
      .spyOn(AttendanceRepository, "assignRegistrationToken")
      .mockResolvedValue(0);

    const pass = await AttendanceService.getOrCreateStudentPass("reg-race-1", "student-owner");

    expect(assignSpy).toHaveBeenCalled();
    // The resulting pass must use the token already in the DB, never the discarded generated token!
    expect(pass.token).toBe(committedDbToken);
  });
});

describe("Attendance Unit Tests: Team Member Passes & Attendance (Part 3)", () => {
  const memberTokenA = "member_token_aaaa_12345678901234";
  const memberTokenB = "member_token_bbbb_12345678901234";

  const teamData = {
    id: "team-1",
    name: "Nexus Innovators",
    eventId: "event-1",
    event: {
      id: "event-1",
      title: "AI Contest",
      status: "PUBLISHED" as const,
    },
    registrations: [{ id: "reg-team-1", status: "APPROVED" as const }],
    members: [
      {
        id: "member-1",
        fullName: "Zainab Ali",
        rollNumber: "AI-101",
        checkInToken: memberTokenA,
        attendedAt: null,
        attendedById: null,
      },
      {
        id: "member-2",
        fullName: "Hamza Tariq",
        rollNumber: "AI-102",
        checkInToken: memberTokenB,
        attendedAt: null,
        attendedById: null,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checks in a team member separately and displays team progress (1 of 2)", async () => {
    const matchA: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-1",
        teamId: "team-1",
        fullName: "Zainab Ali",
        rollNumber: "AI-101",
        checkInToken: memberTokenA,
        attendedAt: null,
        attendedById: null,
        team: teamData,
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(matchA);
    vi.spyOn(AttendanceRepository, "markTeamMemberAttended").mockResolvedValue(1);

    const result = await AttendanceService.checkInByToken({
      token: memberTokenA,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.registration?.studentName).toBe("Zainab Ali");
    expect(result.registration?.rollNumber).toBe("AI-101");
    expect(result.registration?.teamName).toBe("Nexus Innovators");
    expect(result.registration?.teamProgress).toBe("1 of 2 team members checked in");
  });

  it("repeat scan of the same member is idempotent and does not modify state", async () => {
    const attendedTime = new Date("2026-10-18T10:00:00Z");
    const matchAlreadyCheckedIn: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-1",
        teamId: "team-1",
        fullName: "Zainab Ali",
        rollNumber: "AI-101",
        checkInToken: memberTokenA,
        attendedAt: attendedTime,
        attendedById: "org-1",
        team: {
          ...teamData,
          members: [
            { ...teamData.members[0], attendedAt: attendedTime },
            teamData.members[1],
          ],
        },
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(matchAlreadyCheckedIn);
    const markSpy = vi.spyOn(AttendanceRepository, "markTeamMemberAttended");

    const result = await AttendanceService.checkInByToken({
      token: memberTokenA,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.attendedAt).toEqual(attendedTime);
    expect(markSpy).not.toHaveBeenCalled();
    expect(result.registration?.teamProgress).toBe("1 of 2 team members checked in");
  });

  it("checking in a second member of the same team increments team progress (2 of 2)", async () => {
    const member1Attended = new Date("2026-10-18T10:00:00Z");
    const matchB: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-2",
        teamId: "team-1",
        fullName: "Hamza Tariq",
        rollNumber: "AI-102",
        checkInToken: memberTokenB,
        attendedAt: null,
        attendedById: null,
        team: {
          ...teamData,
          members: [
            { ...teamData.members[0], attendedAt: member1Attended },
            teamData.members[1],
          ],
        },
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(matchB);
    vi.spyOn(AttendanceRepository, "markTeamMemberAttended").mockResolvedValue(1);

    const result = await AttendanceService.checkInByToken({
      token: memberTokenB,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.registration?.studentName).toBe("Hamza Tariq");
    expect(result.registration?.teamProgress).toBe("2 of 2 team members checked in");
  });

  it("rejects check-in if the member is scanned for a different event", async () => {
    const matchA: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-1",
        teamId: "team-1",
        fullName: "Zainab Ali",
        rollNumber: "AI-101",
        checkInToken: memberTokenA,
        attendedAt: null,
        attendedById: null,
        team: teamData, // event-1
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(matchA);

    const result = await AttendanceService.checkInByToken({
      token: memberTokenA,
      eventId: "event-wrong",
      organizerId: "org-1",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("WRONG_EVENT");
    expect(result.message).toContain("AI Contest");
  });

  it("old team-level registration token returns LEGACY_TEAM_TOKEN instruction", async () => {
    const oldTeamToken = "legacy_team_token_12345678901234";
    const legacyRegistrationMatch: ParticipantTokenMatch = {
      type: "REGISTRATION",
      registration: {
        id: "reg-legacy-1",
        teamId: "team-1",
        eventId: "event-1",
        status: "APPROVED" as const,
        checkInToken: oldTeamToken,
        attendedAt: null,
        attendedById: null,
        event: { id: "event-1", title: "AI Contest", status: "PUBLISHED" as const },
        user: { name: "Team Lead", rollNumber: "AI-101" },
        team: { name: "Nexus Innovators" },
      } as unknown as MockRegistration,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(legacyRegistrationMatch);

    const result = await AttendanceService.checkInByToken({
      token: oldTeamToken,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("LEGACY_TEAM_TOKEN");
    expect(result.message).toContain("Please ask the participant to open their updated pass");
  });

  it("handles race condition in member check-in when markTeamMemberAttended returns 0", async () => {
    const originalAttended = new Date("2026-10-18T10:05:00Z");
    const matchA: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-1",
        teamId: "team-1",
        fullName: "Zainab Ali",
        rollNumber: "AI-101",
        checkInToken: memberTokenA,
        attendedAt: null,
        attendedById: null,
        team: teamData,
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(matchA);
    // Mark returns 0 rows updated because another process checked in at the exact same instant
    vi.spyOn(AttendanceRepository, "markTeamMemberAttended").mockResolvedValue(0);
    vi.spyOn(AttendanceRepository, "findTeamMemberById").mockResolvedValue({
      ...matchA.teamMember,
      attendedAt: originalAttended,
    } as unknown as MockTeamMember);

    const result = await AttendanceService.checkInByToken({
      token: memberTokenA,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.attendedAt).toEqual(originalAttended);
  });

  it("returns INVALID_FORMAT with length diagnostic when scanned text is not 32 chars", async () => {
    const result = await AttendanceService.checkInByToken({
      token: "short-token",
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_FORMAT");
    expect(result.scannedLength).toBe(11);
    expect(result.message).toBe("This QR is not a Forté Arena pass");
  });

  it("returns NOT_FOUND when 32-char token does not match any record", async () => {
    const validFormatUnknownToken = "a".repeat(32);
    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(null);

    const result = await AttendanceService.checkInByToken({
      token: validFormatUnknownToken,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("NOT_FOUND");
    expect(result.scannedLength).toBe(32);
    expect(result.message).toBe("Pass not recognized");
  });

  it("scan and manual paths agree for an event whose results are published: both reject check-in", async () => {
    const publishedResultsEvent = {
      id: "event-results-pub",
      slug: "ai-contest",
      title: "AI Contest",
      venue: "Hall B",
      startsAt: new Date(Date.now() + 86400000), // starts in future
      endsAt: null,
      registrationDeadline: new Date(Date.now() + 86400000),
      resultsPublished: true, // Results published causes getEffectiveStatus to return "COMPLETED"
      status: "PUBLISHED" as const,
    };

    const memberId = "member-res-1";
    const memberToken = "token_results_published_12345678";
    const teamRecord = {
      id: "team-res-1",
      name: "Nexus Innovators",
      eventId: "event-results-pub",
      event: publishedResultsEvent,
      registrations: [{ id: "reg-res-1", status: "APPROVED" as const }],
      members: [
        {
          id: memberId,
          fullName: "Zainab Ali",
          rollNumber: "AI-101",
          email: "zainab@test.com",
          checkInToken: memberToken,
          attendedAt: null,
        },
      ],
    };

    const mockTeamMember = {
      id: memberId,
      teamId: "team-res-1",
      fullName: "Zainab Ali",
      rollNumber: "AI-101",
      email: "zainab@test.com",
      checkInToken: memberToken,
      attendedAt: null,
      attendedById: null,
      team: teamRecord,
    };

    // 1. Scan path (uses findByToken)
    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue({
      type: "TEAM_MEMBER",
      teamMember: mockTeamMember as unknown as MockTeamMember,
    });

    const scanResult = await AttendanceService.checkInByToken({
      token: memberToken,
      eventId: "event-results-pub",
      organizerId: "org-1",
    });

    // 2. Manual check-in path (uses findTeamMemberById)
    vi.spyOn(AttendanceRepository, "findTeamMemberById").mockResolvedValue(
      mockTeamMember as unknown as MockTeamMember
    );

    const manualResult = await AttendanceService.checkInManually({
      participantId: memberId,
      participantType: "TEAM_MEMBER",
      eventId: "event-results-pub",
      organizerId: "org-1",
    });

    // Both paths must agree that the event is not open (status: completed)
    expect(scanResult.success).toBe(false);
    expect(scanResult.code).toBe("EVENT_NOT_OPEN");
    expect(scanResult.message).toBe("This event has ended — attendance can no longer be recorded.");

    expect(manualResult.success).toBe(false);
    expect(manualResult.code).toBe("EVENT_NOT_OPEN");
    expect(manualResult.message).toBe("This event has ended — attendance can no longer be recorded.");
  });
});

describe("Attendance Unit Tests: Timezone Formatting", () => {
  it("formats 2026-10-18T09:30:00Z as 14:30 in the app timezone (Asia/Karachi)", () => {
    expect(APP_TIMEZONE).toBe("Asia/Karachi");
    const formatted = formatTime24("2026-10-18T09:30:00Z");
    expect(formatted).toBe("14:30");
  });
});

describe("Attendance Unit Tests: Status Wording & Card Titles", () => {
  it("returns user-friendly messages for EVENT_NOT_OPEN per event lifecycle status", () => {
    expect(getEventNotOpenMessage("COMPLETED")).toBe(
      "This event has ended — attendance can no longer be recorded."
    );
    expect(getEventNotOpenMessage("CANCELLED")).toBe(
      "This event was cancelled."
    );
    expect(getEventNotOpenMessage("DRAFT")).toBe(
      "This event is not published yet."
    );
    expect(getEventNotOpenMessage("OTHER")).toBe(
      "This event is closed — attendance can no longer be recorded for it."
    );
  });

  it("returns appropriate scan result card titles per event status", () => {
    expect(getEventNotOpenCardTitle("COMPLETED")).toBe("Event Closed");
    expect(getEventNotOpenCardTitle("CANCELLED")).toBe("Event Cancelled");
    expect(getEventNotOpenCardTitle("DRAFT")).toBe("Not Published");
    expect(getEventNotOpenCardTitle("CLOSED")).toBe("Event Closed");
    expect(getEventNotOpenCardTitle(undefined)).toBe("Event Closed");
  });
});

describe("Attendance Unit Tests: Scanner Event Ordering", () => {
  it("sorts allowed events first (nearest to now), then non-allowed events (most recent first)", () => {
    const fixedNow = new Date("2026-10-19T12:00:00Z");

    const events = [
      { id: "draft-future", title: "Draft Future", status: "DRAFT", startsAt: new Date("2026-10-25T10:00:00Z") },
      { id: "completed-yesterday", title: "Completed Yesterday", status: "COMPLETED", startsAt: new Date("2026-10-18T10:00:00Z") },
      { id: "pub-in-2h", title: "Published in 2 Hours", status: "PUBLISHED", startsAt: new Date("2026-10-19T14:00:00Z") },
      { id: "closed-started-30m-ago", title: "Closed Started 30m Ago", status: "CLOSED", startsAt: new Date("2026-10-19T11:30:00Z") },
      { id: "completed-last-week", title: "Completed Last Week", status: "COMPLETED", startsAt: new Date("2026-10-12T10:00:00Z") },
      { id: "pub-next-week", title: "Published Next Week", status: "PUBLISHED", startsAt: new Date("2026-10-26T10:00:00Z") },
      { id: "cancelled-today", title: "Cancelled Today", status: "CANCELLED", startsAt: new Date("2026-10-19T16:00:00Z") },
    ];

    const sorted = sortEventsForScanner(events, fixedNow);
    const sortedIds = sorted.map((e) => e.id);

    // Group 1: Allowed events (PUBLISHED, CLOSED) nearest to fixedNow (2026-10-19T12:00:00Z):
    // - closed-started-30m-ago: |11:30 - 12:00| = 30m
    // - pub-in-2h: |14:00 - 12:00| = 2h
    // - pub-next-week: |2026-10-26 - 10-19| = 7 days
    expect(sortedIds.slice(0, 3)).toEqual([
      "closed-started-30m-ago",
      "pub-in-2h",
      "pub-next-week",
    ]);

    // Group 2: Non-allowed events (COMPLETED, CANCELLED, DRAFT) ordered most recent first (startsAt desc):
    // - draft-future: 2026-10-25
    // - cancelled-today: 2026-10-19T16:00
    // - completed-yesterday: 2026-10-18
    // - completed-last-week: 2026-10-12
    expect(sortedIds.slice(3)).toEqual([
      "draft-future",
      "cancelled-today",
      "completed-yesterday",
      "completed-last-week",
    ]);

    // The default selection (first item) must be the event happening right now
    expect(sorted[0].id).toBe("closed-started-30m-ago");
  });
});

describe("Attendance Unit Tests: Summary Counts & Method Split", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates summary counts for solo and team members with QR, Manual, and Earlier split", async () => {
    mockPrisma.registration = {
      groupBy: vi.fn().mockResolvedValue([
        { status: "PENDING", _count: { _all: 3 } },
        { status: "APPROVED", _count: { _all: 10 } },
        { status: "REJECTED", _count: { _all: 2 } },
        { status: "WITHDRAWN", _count: { _all: 1 } },
      ]),
      count: vi.fn().mockImplementation((args: MockCountArgs) => {
        const where = args?.where || {};
        if (where.attendanceMethod === "QR") return Promise.resolve(4);
        if (where.attendanceMethod === "MANUAL") return Promise.resolve(2);
        if (where.attendanceMethod === null && where.attendedAt) return Promise.resolve(1);
        if (where.status === "APPROVED") return Promise.resolve(8); // solo approved
        return Promise.resolve(0);
      }),
      update: vi.fn(),
    };

    mockPrisma.teamMember = {
      count: vi.fn().mockImplementation((args: MockCountArgs) => {
        const where = args?.where || {};
        if (where.attendanceMethod === "QR") return Promise.resolve(3);
        if (where.attendanceMethod === "MANUAL") return Promise.resolve(1);
        if (where.attendanceMethod === null && where.attendedAt) return Promise.resolve(0);
        return Promise.resolve(6); // team approved members
      }),
      update: vi.fn(),
    };

    const stats = await AttendanceRepository.getEventDetailedStats("test-event-1");

    // Applications total: 3 + 10 + 2 + 1 = 16
    expect(stats.applications.total).toBe(16);
    expect(stats.applications.pending).toBe(3);
    expect(stats.applications.approved).toBe(10);
    expect(stats.applications.rejected).toBe(2);
    expect(stats.applications.withdrawn).toBe(1);

    // Approved people: 8 solo + 6 team members = 14
    expect(stats.approvedPeople).toBe(14);

    // Present split: QR = 4 + 3 = 7, Manual = 2 + 1 = 3, Earlier = 1 + 0 = 1
    expect(stats.presentSplit.qr).toBe(7);
    expect(stats.presentSplit.manual).toBe(3);
    expect(stats.presentSplit.earlier).toBe(1);

    // Total present: 7 + 3 + 1 = 11
    expect(stats.presentPeople).toBe(11);

    // Not yet present: 14 - 11 = 3
    expect(stats.notYetPresent).toBe(3);

    // Percentage: Math.round((11 / 14) * 100) = 79%
    expect(stats.percentage).toBe(79);
  });

  it("handles empty event with zero registrations gracefully", async () => {
    mockPrisma.registration = {
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
    };
    mockPrisma.teamMember = {
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
    };

    const stats = await AttendanceRepository.getEventDetailedStats("empty-event");
    expect(stats.applications.total).toBe(0);
    expect(stats.approvedPeople).toBe(0);
    expect(stats.presentPeople).toBe(0);
    expect(stats.notYetPresent).toBe(0);
    expect(stats.percentage).toBe(0);
    expect(stats.presentSplit).toEqual({ qr: 0, manual: 0, earlier: 0 });
  });
});

describe("Attendance Unit Tests: Method Recording (QR vs MANUAL)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checkInByToken sets attendanceMethod to QR for solo participant", async () => {
    const markSoloSpy = vi.spyOn(AttendanceRepository, "markRegistrationAttended").mockResolvedValue(1);
    const soloToken = "a".repeat(32);

    const mockReg: ParticipantTokenMatch = {
      type: "REGISTRATION",
      registration: {
        id: "reg-solo-1",
        eventId: "event-1",
        teamId: null,
        status: "APPROVED" as const,
        checkInToken: soloToken,
        attendedAt: null,
        attendedById: null,
        attendanceMethod: null,
        event: { id: "event-1", title: "Live Hackathon", status: "PUBLISHED" as const },
        user: { name: "Solo Student", rollNumber: "CS-100" },
        team: null,
      } as unknown as MockRegistration,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(mockReg);

    const result = await AttendanceService.checkInByToken({
      token: soloToken,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(markSoloSpy).toHaveBeenCalledTimes(1);
    expect(markSoloSpy).toHaveBeenCalledWith("reg-solo-1", "org-1", expect.any(Date), "QR");
  });

  it("checkInByToken sets attendanceMethod to QR for team member", async () => {
    const markTeamSpy = vi.spyOn(AttendanceRepository, "markTeamMemberAttended").mockResolvedValue(1);
    const teamMemberToken = "b".repeat(32);

    const mockMemberMatch: ParticipantTokenMatch = {
      type: "TEAM_MEMBER",
      teamMember: {
        id: "member-qr-1",
        teamId: "team-1",
        fullName: "Team Member One",
        rollNumber: "CS-200",
        checkInToken: teamMemberToken,
        attendedAt: null,
        attendedById: null,
        attendanceMethod: null,
        team: {
          id: "team-1",
          name: "Alpha Squad",
          eventId: "event-1",
          event: { id: "event-1", title: "Live Hackathon", status: "PUBLISHED" as const },
          registrations: [{ id: "reg-team-1", status: "APPROVED" as const }],
          members: [{ id: "member-qr-1", attendedAt: null }],
        },
      } as unknown as MockTeamMember,
    };

    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(mockMemberMatch);

    const result = await AttendanceService.checkInByToken({
      token: teamMemberToken,
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(markTeamSpy).toHaveBeenCalledTimes(1);
    expect(markTeamSpy).toHaveBeenCalledWith("member-qr-1", "org-1", expect.any(Date), "QR");
  });

  it("checkInManually sets attendanceMethod to MANUAL for solo participant", async () => {
    const markSoloSpy = vi.spyOn(AttendanceRepository, "markRegistrationAttended").mockResolvedValue(1);

    const mockReg = {
      id: "reg-manual-solo",
      eventId: "event-1",
      teamId: null,
      status: "APPROVED" as const,
      attendedAt: null,
      attendedById: null,
      attendanceMethod: null,
      event: { id: "event-1", title: "Live Hackathon", status: "PUBLISHED" as const },
      user: { name: "Manual Solo Student", rollNumber: "CS-300" },
      team: null,
    };

    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue(mockReg as unknown as MockRegistration);

    const result = await AttendanceService.checkInManually({
      participantId: "reg-manual-solo",
      participantType: "SOLO",
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(markSoloSpy).toHaveBeenCalledTimes(1);
    expect(markSoloSpy).toHaveBeenCalledWith("reg-manual-solo", "org-1", expect.any(Date), "MANUAL");
  });

  it("checkInManually sets attendanceMethod to MANUAL for team member", async () => {
    const markTeamSpy = vi.spyOn(AttendanceRepository, "markTeamMemberAttended").mockResolvedValue(1);

    const mockMember = {
      id: "member-manual-1",
      teamId: "team-1",
      fullName: "Manual Team Member",
      rollNumber: "CS-400",
      attendedAt: null,
      attendedById: null,
      attendanceMethod: null,
      team: {
        id: "team-1",
        name: "Alpha Squad",
        eventId: "event-1",
        event: { id: "event-1", title: "Live Hackathon", status: "PUBLISHED" as const },
        registrations: [{ id: "reg-team-1", status: "APPROVED" as const }],
        members: [{ id: "member-manual-1", attendedAt: null }],
      },
    };

    vi.spyOn(AttendanceRepository, "findTeamMemberById").mockResolvedValue(mockMember as unknown as MockTeamMember);

    const result = await AttendanceService.checkInManually({
      participantId: "member-manual-1",
      participantType: "TEAM_MEMBER",
      eventId: "event-1",
      organizerId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(markTeamSpy).toHaveBeenCalledTimes(1);
    expect(markTeamSpy).toHaveBeenCalledWith("member-manual-1", "org-1", expect.any(Date), "MANUAL");
  });
});

describe("Attendance Unit Tests: Undo Clears Method", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("undoCheckIn clears attendanceMethod to null for solo participant", async () => {
    const clearSoloSpy = vi.spyOn(AttendanceRepository, "clearRegistrationAttended").mockResolvedValue({
      id: "reg-solo-undo",
      eventId: "event-1",
    });

    const result = await AttendanceService.undoCheckIn({
      participantId: "reg-solo-undo",
      participantType: "SOLO",
    });

    expect(result.id).toBe("reg-solo-undo");
    expect(clearSoloSpy).toHaveBeenCalledWith("reg-solo-undo");
  });

  it("undoCheckIn clears attendanceMethod to null for team member", async () => {
    const clearTeamSpy = vi.spyOn(AttendanceRepository, "clearTeamMemberAttended").mockResolvedValue({
      id: "member-undo-1",
      eventId: "event-1",
    });

    const result = await AttendanceService.undoCheckIn({
      participantId: "member-undo-1",
      participantType: "TEAM_MEMBER",
    });

    expect(result.id).toBe("member-undo-1");
    expect(clearTeamSpy).toHaveBeenCalledWith("member-undo-1");
  });

  it("clearRegistrationAttended passes attendanceMethod: null and attendedAt: null in atomic update", async () => {
    const updateSpy = vi.fn().mockResolvedValue({ id: "reg-1", eventId: "event-1" });
    mockPrisma.registration = {
      groupBy: vi.fn(),
      count: vi.fn(),
      update: updateSpy,
    };

    await AttendanceRepository.clearRegistrationAttended("reg-1");

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "reg-1" },
      data: {
        attendedAt: null,
        attendedById: null,
        attendanceMethod: null,
      },
      select: { id: true, eventId: true },
    });
  });

  it("clearTeamMemberAttended passes attendanceMethod: null and attendedAt: null in atomic update", async () => {
    const updateSpy = vi.fn().mockResolvedValue({
      id: "member-1",
      team: { eventId: "event-1" },
    });
    mockPrisma.teamMember = {
      count: vi.fn(),
      update: updateSpy,
    };

    await AttendanceRepository.clearTeamMemberAttended("member-1");

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        attendedAt: null,
        attendedById: null,
        attendanceMethod: null,
      },
      select: {
        id: true,
        team: { select: { eventId: true } },
      },
    });
  });
});

describe("Attendance Unit Tests: Manual Check-In Gated by Event Status", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const statusesToBlock = ["COMPLETED", "CANCELLED", "DRAFT"] as const;

  for (const status of statusesToBlock) {
    it(`blocks manual check-in when event status is ${status}`, async () => {
      const markSoloSpy = vi.spyOn(AttendanceRepository, "markRegistrationAttended");
      const markTeamSpy = vi.spyOn(AttendanceRepository, "markTeamMemberAttended");

      const mockReg = {
        id: "reg-blocked-status",
        eventId: "event-blocked",
        status: "APPROVED" as const,
        attendedAt: null,
        attendedById: null,
        event: { id: "event-blocked", title: "Finished Event", status },
        user: { name: "Blocked Student", rollNumber: "CS-500" },
        team: null,
      };

      vi.spyOn(AttendanceRepository, "findById").mockResolvedValue(mockReg as unknown as MockRegistration);

      const result = await AttendanceService.checkInManually({
        participantId: "reg-blocked-status",
        participantType: "SOLO",
        eventId: "event-blocked",
        organizerId: "org-1",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("EVENT_NOT_OPEN");
      expect(markSoloSpy).not.toHaveBeenCalled();
      expect(markTeamSpy).not.toHaveBeenCalled();
    });
  }
});

describe("Attendance Unit Tests: CSV Rows & Export Generation", () => {
  const participants: AttendanceParticipantItem[] = [
    {
      id: "p1",
      participantType: "SOLO",
      name: "Alice Khan",
      rollNumber: "CS-2023-01",
      department: "Computer Science",
      teamName: null,
      attendedAt: new Date("2026-10-19T09:30:00Z"),
      attendedBy: { name: "Organizer Staff" },
      attendanceMethod: "QR",
    },
    {
      id: "p2",
      participantType: "SOLO",
      name: "Bob Smith",
      rollNumber: "EE-2023-02",
      department: "Electrical Eng",
      teamName: null,
      attendedAt: new Date("2026-10-19T09:30:00Z"),
      attendedBy: { name: "Organizer Staff" },
      attendanceMethod: "MANUAL",
    },
    {
      id: "p3",
      participantType: "SOLO",
      name: "Charlie Davis",
      rollNumber: "ME-2023-03",
      department: "Mechanical Eng",
      teamName: null,
      attendedAt: new Date("2026-10-19T09:30:00Z"),
      attendedBy: { name: "Organizer Staff" },
      attendanceMethod: null, // Earlier / legacy check-in
    },
    {
      id: "p4",
      participantType: "TEAM_MEMBER",
      name: "Dave Wilson",
      rollNumber: "SE-2023-04",
      department: null,
      teamName: "Code Warriors",
      attendedAt: new Date("2026-10-19T09:30:00Z"),
      attendedBy: { name: "Organizer Staff" },
      attendanceMethod: "QR",
    },
    {
      id: "p5",
      participantType: "TEAM_MEMBER",
      name: "Eve Taylor",
      rollNumber: "SE-2023-05",
      department: null,
      teamName: "Code Warriors",
      attendedAt: null,
      attendedBy: null,
      attendanceMethod: null, // Not yet present
    },
  ];

  it("exports exact ATTENDANCE_CSV_HEADERS", () => {
    expect(ATTENDANCE_CSV_HEADERS).toEqual([
      "Name",
      "Roll Number",
      "Department",
      "Team",
      "Present",
      "Time",
      "Method",
    ]);
  });

  it("builds correct CSV rows matching specifications", () => {
    const rows = buildAttendanceCsvRows(participants);
    expect(rows).toHaveLength(5);

    // Solo QR: Yes, 14:30 in Asia/Karachi, QR
    expect(rows[0]).toEqual([
      "Alice Khan",
      "CS-2023-01",
      "Computer Science",
      "",
      "Yes",
      "14:30",
      "QR",
    ]);

    // Solo MANUAL: Yes, 14:30, Manual
    expect(rows[1]).toEqual([
      "Bob Smith",
      "EE-2023-02",
      "Electrical Eng",
      "",
      "Yes",
      "14:30",
      "Manual",
    ]);

    // Solo Earlier / Unknown: Yes, 14:30, Earlier / Unknown
    expect(rows[2]).toEqual([
      "Charlie Davis",
      "ME-2023-03",
      "Mechanical Eng",
      "",
      "Yes",
      "14:30",
      "Earlier / Unknown",
    ]);

    // Team Member QR: Yes, 14:30, QR, team name present, department empty
    expect(rows[3]).toEqual([
      "Dave Wilson",
      "SE-2023-04",
      "",
      "Code Warriors",
      "Yes",
      "14:30",
      "QR",
    ]);

    // Team Member Not present: No, empty time, empty method
    expect(rows[4]).toEqual([
      "Eve Taylor",
      "SE-2023-05",
      "",
      "Code Warriors",
      "No",
      "",
      "",
    ]);
  });

  it("generateAttendanceCsv produces full RFC 4180 CSV string with CRLF line breaks", () => {
    const csv = generateAttendanceCsv(participants);
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(6); // 1 header + 5 rows
    expect(lines[0]).toBe("Name,Roll Number,Department,Team,Present,Time,Method");
    expect(lines[1]).toBe("Alice Khan,CS-2023-01,Computer Science,,Yes,14:30,QR");
    expect(lines[2]).toBe("Bob Smith,EE-2023-02,Electrical Eng,,Yes,14:30,Manual");
    expect(lines[3]).toBe("Charlie Davis,ME-2023-03,Mechanical Eng,,Yes,14:30,Earlier / Unknown");
    expect(lines[4]).toBe("Dave Wilson,SE-2023-04,,Code Warriors,Yes,14:30,QR");
    expect(lines[5]).toBe("Eve Taylor,SE-2023-05,,Code Warriors,No,,");
  });
});

