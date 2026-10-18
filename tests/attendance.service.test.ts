import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  generateCheckInToken,
  evaluateCheckInEligibility,
  AttendanceService,
} from "@/features/attendance/services/attendance.service";
import { AttendanceRepository } from "@/features/attendance/repositories/attendance.repository";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTime24 } from "@/lib/dates";
import { APP_TIMEZONE } from "@/config/app";

describe("Attendance Unit Tests: Token Generation", () => {
  it("generates URL-safe tokens of at least 32 characters", () => {
    const token = generateCheckInToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThanOrEqual(32);
    // Base64url character set: A-Z, a-z, 0-9, -, _
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces unique unguessable tokens with zero collisions across 1,000 iterations", () => {
    const set = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      set.add(generateCheckInToken());
    }
    expect(set.size).toBe(count);
  });
});

describe("Attendance Unit Tests: Check-In Evaluation Rules", () => {
  const baseRegistration = {
    id: "reg-123",
    eventId: "event-a",
    status: "APPROVED",
    attendedAt: null,
    event: { title: "Hackathon 2026" },
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
        status: "PENDING",
      },
      targetEventId: "event-a",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("NOT_APPROVED");
    expect(res.message).toContain("only approved participants");
  });

  it("rejects check-in if registration is rejected", () => {
    const res = evaluateCheckInEligibility({
      registration: {
        ...baseRegistration,
        status: "REJECTED",
      },
      targetEventId: "event-a",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("NOT_APPROVED");
    expect(res.message).toContain("only approved participants");
  });

  it("rejects check-in if registration belongs to a different event", () => {
    const res = evaluateCheckInEligibility({
      registration: baseRegistration, // registered for "event-a"
      targetEventId: "event-b",       // organizer scanning for "event-b"
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("WRONG_EVENT");
    expect(res.message).toContain("Hackathon 2026");
  });

  it("rejects check-in if token is unrecognized or registration not found", () => {
    const res = evaluateCheckInEligibility({
      registration: null,
      targetEventId: "event-a",
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("INVALID_CODE");
    expect(res.message).toContain("invalid QR code");
  });
});

type MockRegistration = NonNullable<
  Awaited<ReturnType<typeof AttendanceRepository.findById>>
>;

describe("Attendance Unit Tests: Pass Ownership & Lifecycle", () => {
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

  it("rejects pass access if the registration is not approved", async () => {
    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue({
      id: "reg-999",
      userId: "student-owner",
      eventId: "event-a",
      status: "PENDING",
      checkInToken: null,
      attendedAt: null,
      attendedById: null,
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
      AttendanceService.getOrCreateStudentPass("reg-999", "student-owner")
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError if registration does not exist", async () => {
    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue(null);

    await expect(
      AttendanceService.getOrCreateStudentPass("non-existent-id", "user-123")
    ).rejects.toThrow(NotFoundError);
  });

  it("lazily assigns a token and generates QR pass data for approved owner", async () => {
    const mockRecord = {
      id: "reg-1",
      userId: "student-1",
      eventId: "event-1",
      status: "APPROVED",
      checkInToken: null,
      attendedAt: null,
      attendedById: null,
      event: {
        id: "event-1",
        slug: "web-dev",
        title: "Web Dev Showdown",
        venue: "Lab 3",
        startsAt: new Date("2026-11-01T10:00:00Z"),
        endsAt: null,
        status: "PUBLISHED",
      },
      user: {
        id: "student-1",
        name: "Sara Ali",
        email: "sara@test.com",
        rollNumber: "SE-2023-010",
        department: "SE",
        phone: "03001234567",
      },
      team: null,
      attendedBy: null,
    };

    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue(
      mockRecord as unknown as MockRegistration
    );
    const assignSpy = vi
      .spyOn(AttendanceRepository, "assignCheckInToken")
      .mockImplementation(async (id, token) =>
        ({
          ...mockRecord,
          checkInToken: token,
        } as unknown as MockRegistration)
      );

    const pass = await AttendanceService.getOrCreateStudentPass("reg-1", "student-1");

    expect(assignSpy).toHaveBeenCalled();
    expect(pass.token).toBeDefined();
    expect(pass.token?.length).toBeGreaterThanOrEqual(32);
    expect(pass.qrDataUrl).toContain("data:image/png;base64,");
    expect(pass.student.name).toBe("Sara Ali");
    expect(pass.event.title).toBe("Web Dev Showdown");
  });
});

describe("Attendance Unit Tests: Timezone Formatting", () => {
  it("formats 2026-10-18T09:30:00Z as 14:30 in the app timezone (Asia/Karachi)", () => {
    expect(APP_TIMEZONE).toBe("Asia/Karachi");
    const formatted = formatTime24("2026-10-18T09:30:00Z");
    expect(formatted).toBe("14:30");
  });
});

describe("Attendance Unit Tests: Atomic Check-In Concurrency & Fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles race condition: when markAttended returns 0 due to concurrent scan, returns alreadyCheckedIn with original attendedAt", async () => {
    const originalAttendedAt = new Date("2026-10-18T09:30:00Z");
    const mockRecord = {
      id: "reg-concurrent-1",
      eventId: "event-1",
      status: "APPROVED",
      checkInToken: "valid-token-123",
      attendedAt: null,
      event: { title: "Robotics Contest" },
      user: { name: "Ali Ahmed", rollNumber: "CS-100" },
      team: null,
    };

    // First lookup finds the record
    vi.spyOn(AttendanceRepository, "findByToken").mockResolvedValue(
      mockRecord as unknown as MockRegistration
    );

    // Simultaneous scan won the race: updateMany updated 0 rows
    vi.spyOn(AttendanceRepository, "markAttended").mockResolvedValue(0);

    // Re-reading finds the original registration state with the winning attendedAt
    vi.spyOn(AttendanceRepository, "findById").mockResolvedValue({
      ...mockRecord,
      attendedAt: originalAttendedAt,
    } as unknown as MockRegistration);

    const result = await AttendanceService.checkInByToken({
      token: "valid-token-123",
      eventId: "event-1",
      organizerId: "organizer-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.attendedAt).toEqual(originalAttendedAt);
    expect(result.message).toBe("Already checked in at 14:30");
  });

  it("handles race condition in manual check-in when markAttended returns 0", async () => {
    const originalAttendedAt = new Date("2026-10-18T09:30:00Z");
    const mockRecord = {
      id: "reg-concurrent-2",
      eventId: "event-1",
      status: "APPROVED",
      checkInToken: "token-456",
      attendedAt: null,
      event: { title: "Robotics Contest" },
      user: { name: "Zainab Bibi", rollNumber: "CS-101" },
      team: null,
    };

    vi.spyOn(AttendanceRepository, "findById")
      .mockResolvedValueOnce(mockRecord as unknown as MockRegistration)
      .mockResolvedValueOnce({
        ...mockRecord,
        attendedAt: originalAttendedAt,
      } as unknown as MockRegistration);

    vi.spyOn(AttendanceRepository, "markAttended").mockResolvedValue(0);

    const result = await AttendanceService.checkInByRegistrationId({
      registrationId: "reg-concurrent-2",
      eventId: "event-1",
      organizerId: "organizer-1",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.attendedAt).toEqual(originalAttendedAt);
    expect(result.message).toBe("Already checked in at 14:30");
  });
});

