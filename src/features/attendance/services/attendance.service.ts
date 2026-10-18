import crypto from "node:crypto";
import QRCode from "qrcode";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTime24 } from "@/lib/dates";

export interface CheckInResult {
  success: boolean;
  code?: "INVALID_CODE" | "WRONG_EVENT" | "NOT_APPROVED" | "NOT_FOUND";
  alreadyCheckedIn?: boolean;
  attendedAt?: Date;
  registration?: {
    id: string;
    studentName: string;
    rollNumber: string | null;
    teamName: string | null;
    eventTitle: string;
  };
  message: string;
}

/**
 * Generate a cryptographically random, unguessable URL-safe token.
 * 24 random bytes in base64url produces a 32-character token.
 */
export function generateCheckInToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Pure evaluation rule for check-in eligibility.
 * Evaluates registration status, event matching, and idempotency.
 */
export function evaluateCheckInEligibility({
  registration,
  targetEventId,
}: {
  registration: {
    id: string;
    eventId: string;
    status: string;
    attendedAt: Date | null;
    event: { title: string };
    user: { name: string; rollNumber: string | null };
    team?: { name: string } | null;
  } | null;
  targetEventId: string;
}): CheckInResult {
  if (!registration) {
    return {
      success: false,
      code: "INVALID_CODE",
      message: "Pass not recognized or invalid QR code.",
    };
  }

  if (registration.eventId !== targetEventId) {
    return {
      success: false,
      code: "WRONG_EVENT",
      message: `This pass is registered for "${registration.event.title}", not this event.`,
    };
  }

  if (registration.status !== "APPROVED") {
    return {
      success: false,
      code: "NOT_APPROVED",
      message: `Registration is ${registration.status.toLowerCase()} (only approved participants can enter).`,
    };
  }

  const registrationSummary = {
    id: registration.id,
    studentName: registration.user.name,
    rollNumber: registration.user.rollNumber,
    teamName: registration.team?.name || null,
    eventTitle: registration.event.title,
  };

  if (registration.attendedAt) {
    const formattedTime = formatTime24(registration.attendedAt);

    return {
      success: true,
      alreadyCheckedIn: true,
      attendedAt: registration.attendedAt,
      registration: registrationSummary,
      message: `Already checked in at ${formattedTime}`,
    };
  }

  return {
    success: true,
    alreadyCheckedIn: false,
    registration: registrationSummary,
    message: "Valid for check-in",
  };
}

export class AttendanceService {
  /**
   * Generates or retrieves the student's personal entry pass.
   * Lazily creates a checkInToken if one does not exist yet.
   * Enforces server-side ownership (student must be owner of registration).
   */
  static async getOrCreateStudentPass(registrationId: string, userId: string) {
    let registration = await AttendanceRepository.findById(registrationId);

    if (!registration) {
      throw new NotFoundError("Registration not found");
    }

    if (registration.userId !== userId) {
      throw new ForbiddenError("You are not authorized to view this entry pass");
    }

    if (registration.status !== "APPROVED") {
      throw new ForbiddenError(
        "An entry pass is only available for approved registrations"
      );
    }

    // Lazy token generation if not set yet
    const activeToken: string =
      registration.checkInToken || generateCheckInToken();

    if (!registration.checkInToken) {
      registration = await AttendanceRepository.assignCheckInToken(
        registration.id,
        activeToken
      );
    }

    // Generate QR code data URL (dark QR on pure white background with quiet margin)
    const qrDataUrl: string = await QRCode.toDataURL(activeToken, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return {
      registrationId: registration.id,
      token: activeToken,
      qrDataUrl,
      status: registration.status,
      attendedAt: registration.attendedAt,
      event: {
        id: registration.event.id,
        slug: registration.event.slug,
        title: registration.event.title,
        startsAt: registration.event.startsAt,
        endsAt: registration.event.endsAt,
        venue: registration.event.venue,
      },
      student: {
        id: registration.user.id,
        name: registration.user.name,
        rollNumber: registration.user.rollNumber,
        department: registration.user.department,
        email: registration.user.email,
        phone: registration.user.phone,
      },
      team: registration.team
        ? {
            id: registration.team.id,
            name: registration.team.name,
            members: registration.team.members.map((m) => ({
              id: m.id,
              fullName: m.fullName,
              rollNumber: m.rollNumber,
              email: m.email,
            })),
          }
        : null,
    };
  }

  /**
   * Process a QR scan check-in.
   * Ensures token validation, event matching, status check, and idempotency.
   */
  static async checkInByToken({
    token,
    eventId,
    organizerId,
  }: {
    token: string;
    eventId: string;
    organizerId: string;
  }): Promise<CheckInResult> {
    const registration = await AttendanceRepository.findByToken(token);

    const evaluation = evaluateCheckInEligibility({
      registration,
      targetEventId: eventId,
    });

    // If invalid or already checked in, return the evaluation immediately (do not overwrite attendedAt)
    if (!evaluation.success || evaluation.alreadyCheckedIn) {
      return evaluation;
    }

    // Otherwise, mark attended atomically
    const attendedAt = new Date();
    const updatedCount = await AttendanceRepository.markAttended(
      registration!.id,
      organizerId,
      attendedAt
    );

    if (updatedCount === 0) {
      // Simultaneous scan race condition: re-read registration to obtain the original attended timestamp
      const freshRegistration = await AttendanceRepository.findById(registration!.id);
      const originalAttendedAt = freshRegistration?.attendedAt || attendedAt;
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: originalAttendedAt,
        registration: evaluation.registration,
        message: `Already checked in at ${formatTime24(originalAttendedAt)}`,
      };
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      attendedAt,
      registration: evaluation.registration,
      message: "Checked in successfully",
    };
  }

  /**
   * Process manual check-in by registration ID.
   * Applies the exact same authorization, event matching, and idempotency rules.
   */
  static async checkInByRegistrationId({
    registrationId,
    eventId,
    organizerId,
  }: {
    registrationId: string;
    eventId: string;
    organizerId: string;
  }): Promise<CheckInResult> {
    const registration = await AttendanceRepository.findById(registrationId);

    const evaluation = evaluateCheckInEligibility({
      registration,
      targetEventId: eventId,
    });

    if (!evaluation.success || evaluation.alreadyCheckedIn) {
      return evaluation;
    }

    const attendedAt = new Date();
    const updatedCount = await AttendanceRepository.markAttended(
      registration!.id,
      organizerId,
      attendedAt
    );

    if (updatedCount === 0) {
      const freshRegistration = await AttendanceRepository.findById(registration!.id);
      const originalAttendedAt = freshRegistration?.attendedAt || attendedAt;
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: originalAttendedAt,
        registration: evaluation.registration,
        message: `Already checked in at ${formatTime24(originalAttendedAt)}`,
      };
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      attendedAt,
      registration: evaluation.registration,
      message: "Checked in successfully",
    };
  }

  /**
   * Undo a check-in (clears attendedAt and attendedById).
   */
  static async undoCheckIn(registrationId: string) {
    const registration = await AttendanceRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundError("Registration not found");
    }

    return AttendanceRepository.clearAttended(registrationId);
  }

  /**
   * Get event attendance statistics and recent check-ins.
   */
  static async getEventStats(eventId: string) {
    return AttendanceRepository.getEventAttendanceStats(eventId);
  }

  /**
   * Search approved registrations for manual check-in.
   */
  static async searchRegistrations(eventId: string, query: string) {
    return AttendanceRepository.searchEventRegistrations(eventId, query);
  }

  /**
   * Get all events scannable by organizers.
   */
  static async getScannableEvents() {
    return AttendanceRepository.getScannableEvents();
  }
}
