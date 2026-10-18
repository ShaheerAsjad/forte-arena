import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

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
    expect(res.message).toContain("completed");
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
    expect(scanResult.message).toContain("completed");

    expect(manualResult.success).toBe(false);
    expect(manualResult.code).toBe("EVENT_NOT_OPEN");
    expect(manualResult.message).toContain("completed");
  });
});

describe("Attendance Unit Tests: Timezone Formatting", () => {
  it("formats 2026-10-18T09:30:00Z as 14:30 in the app timezone (Asia/Karachi)", () => {
    expect(APP_TIMEZONE).toBe("Asia/Karachi");
    const formatted = formatTime24("2026-10-18T09:30:00Z");
    expect(formatted).toBe("14:30");
  });
});
