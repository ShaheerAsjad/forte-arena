import crypto from "node:crypto";
import QRCode from "qrcode";
import { AttendanceRepository, type ParticipantTokenMatch } from "../repositories/attendance.repository";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatTime24 } from "@/lib/dates";
import { isEventAttendanceAllowed } from "../attendance.config";
import { getEffectiveStatus } from "@/features/events/events.derived";
import { normalizeCheckInToken, isCheckInTokenFormatValid } from "../attendance.schemas";

import type { EventStatus } from "@/lib/db-types";

export interface CheckInResult {
  success: boolean;
  code?:
    | "INVALID_FORMAT"
    | "NOT_FOUND"
    | "WRONG_EVENT"
    | "EVENT_NOT_OPEN"
    | "NOT_APPROVED"
    | "LEGACY_TEAM_TOKEN";
  alreadyCheckedIn?: boolean;
  attendedAt?: Date;
  scannedLength?: number;
  registration?: {
    id: string;
    studentName: string;
    rollNumber: string | null;
    teamName: string | null;
    eventTitle: string;
    teamProgress?: string;
  };
  message: string;
}

/**
 * Generate a cryptographically random, unguessable URL-safe token.
 * 24 random bytes in base64url produces exactly 32 URL-safe characters.
 */
export function generateCheckInToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function computeEffectiveEventStatus(event: {
  status?: EventStatus | string;
  startsAt?: Date | string;
  endsAt?: Date | string | null;
  registrationDeadline?: Date | string;
  resultsPublished?: boolean;
}): EventStatus {
  return getEffectiveStatus({
    status: (event.status || "PUBLISHED") as EventStatus,
    startsAt: event.startsAt || new Date(),
    endsAt: event.endsAt,
    registrationDeadline: event.registrationDeadline || event.startsAt || new Date(),
    resultsPublished: Boolean(event.resultsPublished),
  });
}

export interface EligibilityInput {
  registration: {
    eventId: string;
    status: string;
    attendedAt: Date | string | null;
    event: {
      title: string;
      status?: string;
      startsAt?: Date | string;
      endsAt?: Date | string | null;
      registrationDeadline?: Date | string;
      resultsPublished?: boolean;
    };
    user?: { name: string; rollNumber?: string | null };
    team?: { name: string } | null;
  } | null;
  targetEventId: string;
}

export function evaluateCheckInEligibility({
  registration,
  targetEventId,
}: EligibilityInput): {
  success: boolean;
  code?: string;
  alreadyCheckedIn?: boolean;
  attendedAt?: Date;
  registration?: {
    studentName: string;
    rollNumber?: string | null;
    teamName?: string;
  };
  message?: string;
} {
  if (!registration) {
    return {
      success: false,
      code: "INVALID_CODE",
      message: "Pass not recognized or invalid QR code",
    };
  }

  if (registration.eventId !== targetEventId) {
    return {
      success: false,
      code: "WRONG_EVENT",
      message: `This pass is registered for "${registration.event.title}", not this event.`,
    };
  }

  const rawStatus = registration.event.status;
  const effectiveStatus = rawStatus
    ? computeEffectiveEventStatus(registration.event)
    : "PUBLISHED";

  if (!isEventAttendanceAllowed(effectiveStatus)) {
    return {
      success: false,
      code: "EVENT_NOT_OPEN",
      message: `Check-in is not open for this event (event status: ${effectiveStatus.toLowerCase()}).`,
    };
  }

  if (registration.status !== "APPROVED") {
    return {
      success: false,
      code: "NOT_APPROVED",
      message: "This pass cannot be checked in (only approved participants are admitted).",
    };
  }

  if (registration.attendedAt) {
    const attendedTime = new Date(registration.attendedAt);
    return {
      success: true,
      alreadyCheckedIn: true,
      attendedAt: attendedTime,
      message: `Already checked in at ${formatTime24(attendedTime)}`,
    };
  }

  return {
    success: true,
    alreadyCheckedIn: false,
    registration: {
      studentName: registration.user?.name || "Participant",
      rollNumber: registration.user?.rollNumber,
      teamName: registration.team?.name,
    },
  };
}

export class AttendanceService {
  /**
   * Generates or retrieves entry pass data.
   * - Solo: 1 pass for registration owner.
   * - Team: 1 pass per team member (leader included as team member).
   * Generates tokens lazily and atomically (set only where null, then re-read from DB).
   * QR codes are strictly generated from tokens verified in the database.
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

    const isTeam = registration.team !== null;

    if (!isTeam) {
      // ──────────────────────────────────────────────────────────
      // SOLO REGISTRATION: Atomic token assignment + re-read
      // ──────────────────────────────────────────────────────────
      if (!registration.checkInToken) {
        const candidateToken = generateCheckInToken();
        await AttendanceRepository.assignRegistrationToken(registration.id, candidateToken);
        // ALWAYS re-read from DB so the generated QR strictly reflects committed data
        registration = (await AttendanceRepository.findById(registrationId))!;
      }

      const activeToken = registration.checkInToken!;
      const qrDataUrl: string = await QRCode.toDataURL(activeToken, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 320,
        color: { dark: "#000000", light: "#ffffff" },
      });

      const effectiveStatus = computeEffectiveEventStatus(registration.event);
      const isEventAttendanceOpen = isEventAttendanceAllowed(effectiveStatus);

      return {
        isTeam: false,
        registrationId: registration.id,
        token: activeToken,
        qrDataUrl,
        status: registration.status,
        attendedAt: registration.attendedAt,
        isEventAttendanceOpen,
        event: {
          ...registration.event,
          status: effectiveStatus,
        },
        student: registration.user,
        team: null,
      };
    }

    // ──────────────────────────────────────────────────────────
    // TEAM REGISTRATION: 1 Pass per Team Member
    // ──────────────────────────────────────────────────────────
    const team = registration.team!;

    // Assign tokens atomically for any member missing a token
    for (const member of team.members) {
      if (!member.checkInToken) {
        const candidateToken = generateCheckInToken();
        await AttendanceRepository.assignTeamMemberToken(member.id, candidateToken);
      }
    }

    // Always re-read fresh from DB to get committed tokens
    registration = (await AttendanceRepository.findById(registrationId))!;
    const freshTeam = registration.team!;

    // Identify leader reliably
    const ownerRoll = registration.user.rollNumber?.trim().toLowerCase();
    const ownerEmail = registration.user.email.trim().toLowerCase();

    const membersWithPasses = await Promise.all(
      freshTeam.members.map(async (m) => {
        const token = m.checkInToken!;
        const qrDataUrl: string = await QRCode.toDataURL(token, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: { dark: "#000000", light: "#ffffff" },
        });

        const isLeader = Boolean(
          (ownerRoll && m.rollNumber.trim().toLowerCase() === ownerRoll) ||
          (ownerEmail && m.email && m.email.trim().toLowerCase() === ownerEmail)
        );

        return {
          id: m.id,
          fullName: m.fullName,
          rollNumber: m.rollNumber,
          email: m.email,
          phone: m.phone,
          qrDataUrl,
          attendedAt: m.attendedAt,
          isLeader,
        };
      })
    );

    // Order members consistently: leader first, then alphabetical
    const sortedMembers = [...membersWithPasses].sort((a, b) => {
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    const effectiveStatus = computeEffectiveEventStatus(registration.event);
    const isEventAttendanceOpen = isEventAttendanceAllowed(effectiveStatus);

    return {
      isTeam: true,
      registrationId: registration.id,
      status: registration.status,
      isEventAttendanceOpen,
      event: {
        ...registration.event,
        status: effectiveStatus,
      },
      student: registration.user,
      team: {
        id: freshTeam.id,
        name: freshTeam.name,
        members: sortedMembers,
      },
    };
  }

  /**
   * Process a QR scan check-in.
   * - Normalizes token input.
   * - Validates token format (32 base64url characters).
   * - Checks TeamMember tokens and Registration tokens.
   * - Enforces event status (ATTENDANCE_ALLOWED_EVENT_STATUSES).
   * - Handles atomic concurrency and idempotency.
   */
  static async checkInByToken({
    token: rawToken,
    eventId,
    organizerId,
  }: {
    token: string;
    eventId: string;
    organizerId: string;
  }): Promise<CheckInResult> {
    const token = normalizeCheckInToken(rawToken);

    if (!isCheckInTokenFormatValid(token)) {
      return {
        success: false,
        code: "INVALID_FORMAT",
        scannedLength: rawToken.length,
        message: "This QR is not a Forté Arena pass",
      };
    }

    const match: ParticipantTokenMatch | null = await AttendanceRepository.findByToken(token);

    if (!match) {
      return {
        success: false,
        code: "NOT_FOUND",
        scannedLength: rawToken.length,
        message: "Pass not recognized",
      };
    }

    // ──────────────────────────────────────────────────────────
    // BRANCH A: TEAM MEMBER PASS
    // ──────────────────────────────────────────────────────────
    if (match.type === "TEAM_MEMBER") {
      const { teamMember } = match;
      const team = teamMember.team;
      const event = team.event;

      if (team.eventId !== eventId) {
        return {
          success: false,
          code: "WRONG_EVENT",
          message: `This pass is registered for "${event.title}", not this event.`,
        };
      }

      const effectiveStatus = computeEffectiveEventStatus(event);
      if (!isEventAttendanceAllowed(effectiveStatus)) {
        return {
          success: false,
          code: "EVENT_NOT_OPEN",
          message: `Check-in is not open for this event (status: ${effectiveStatus.toLowerCase()}).`,
        };
      }

      if (team.registrations.length === 0) {
        return {
          success: false,
          code: "NOT_APPROVED",
          message: "Team registration is not approved.",
        };
      }

      const totalMembers = team.members.length;

      // Idempotency check: Already checked in
      if (teamMember.attendedAt) {
        const attendedCount = team.members.filter((m) => m.attendedAt !== null).length;
        const progressStr = `${attendedCount} of ${totalMembers} team members checked in`;
        return {
          success: true,
          alreadyCheckedIn: true,
          attendedAt: teamMember.attendedAt,
          registration: {
            id: teamMember.id,
            studentName: teamMember.fullName,
            rollNumber: teamMember.rollNumber,
            teamName: team.name,
            eventTitle: event.title,
            teamProgress: progressStr,
          },
          message: `Already checked in at ${formatTime24(teamMember.attendedAt)}`,
        };
      }

      // Mark attended atomically
      const attendedAt = new Date();
      const updatedCount = await AttendanceRepository.markTeamMemberAttended(
        teamMember.id,
        organizerId,
        attendedAt
      );

      if (updatedCount === 0) {
        // Concurrent scan race: re-read member
        const fresh = await AttendanceRepository.findTeamMemberById(teamMember.id);
        const originalTime = fresh?.attendedAt || attendedAt;
        const attendedCount = fresh?.team.members.filter((m) => m.attendedAt !== null).length || 1;
        return {
          success: true,
          alreadyCheckedIn: true,
          attendedAt: originalTime,
          registration: {
            id: teamMember.id,
            studentName: teamMember.fullName,
            rollNumber: teamMember.rollNumber,
            teamName: team.name,
            eventTitle: event.title,
            teamProgress: `${attendedCount} of ${totalMembers} team members checked in`,
          },
          message: `Already checked in at ${formatTime24(originalTime)}`,
        };
      }

      const attendedCount =
        team.members.filter((m) => m.attendedAt !== null || m.id === teamMember.id).length;
      const progressStr = `${attendedCount} of ${totalMembers} team members checked in`;

      return {
        success: true,
        alreadyCheckedIn: false,
        attendedAt,
        registration: {
          id: teamMember.id,
          studentName: teamMember.fullName,
          rollNumber: teamMember.rollNumber,
          teamName: team.name,
          eventTitle: event.title,
          teamProgress: progressStr,
        },
        message: `Checked in successfully (${progressStr})`,
      };
    }

    // ──────────────────────────────────────────────────────────
    // BRANCH B: REGISTRATION LEVEL PASS
    // ──────────────────────────────────────────────────────────
    const { registration } = match;

    // Guard: Old team-level token must not silently check in the whole team
    if (registration.teamId !== null) {
      return {
        success: false,
        code: "LEGACY_TEAM_TOKEN",
        message:
          "This is a team pass from an earlier version. Please ask the participant to open their updated pass for individual member check-in.",
      };
    }

    // Solo registration check-in
    if (registration.eventId !== eventId) {
      return {
        success: false,
        code: "WRONG_EVENT",
        message: `This pass is registered for "${registration.event.title}", not this event.`,
      };
    }

    const effectiveStatus = computeEffectiveEventStatus(registration.event);
    if (!isEventAttendanceAllowed(effectiveStatus)) {
      return {
        success: false,
        code: "EVENT_NOT_OPEN",
        message: `Check-in is not open for this event (status: ${effectiveStatus.toLowerCase()}).`,
      };
    }

    if (registration.status !== "APPROVED") {
      return {
        success: false,
        code: "NOT_APPROVED",
        message: `Registration is ${registration.status.toLowerCase()} (only approved participants can enter).`,
      };
    }

    const regSummary = {
      id: registration.id,
      studentName: registration.user.name,
      rollNumber: registration.user.rollNumber,
      teamName: null,
      eventTitle: registration.event.title,
    };

    if (registration.attendedAt) {
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: registration.attendedAt,
        registration: regSummary,
        message: `Already checked in at ${formatTime24(registration.attendedAt)}`,
      };
    }

    const attendedAt = new Date();
    const updatedCount = await AttendanceRepository.markRegistrationAttended(
      registration.id,
      organizerId,
      attendedAt
    );

    if (updatedCount === 0) {
      const fresh = await AttendanceRepository.findById(registration.id);
      const originalTime = fresh?.attendedAt || attendedAt;
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: originalTime,
        registration: regSummary,
        message: `Already checked in at ${formatTime24(originalTime)}`,
      };
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      attendedAt,
      registration: regSummary,
      message: "Checked in successfully",
    };
  }

  /**
   * Process manual check-in by participant ID and type (SOLO or TEAM_MEMBER).
   */
  static async checkInManually({
    participantId,
    participantType,
    eventId,
    organizerId,
  }: {
    participantId: string;
    participantType: "SOLO" | "TEAM_MEMBER";
    eventId: string;
    organizerId: string;
  }): Promise<CheckInResult> {
    if (participantType === "TEAM_MEMBER") {
      const member = await AttendanceRepository.findTeamMemberById(participantId);
      if (!member) {
        return { success: false, code: "NOT_FOUND", message: "Team member not found" };
      }

      const team = member.team;
      const event = team.event;

      if (team.eventId !== eventId) {
        return { success: false, code: "WRONG_EVENT", message: `Member is registered for "${event.title}"` };
      }

      const effectiveStatus = computeEffectiveEventStatus(event);
      if (!isEventAttendanceAllowed(effectiveStatus)) {
        return { success: false, code: "EVENT_NOT_OPEN", message: `Event is ${effectiveStatus.toLowerCase()}` };
      }

      if (team.registrations.length === 0) {
        return { success: false, code: "NOT_APPROVED", message: "Team registration is not approved" };
      }

      const totalMembers = team.members.length;

      if (member.attendedAt) {
        const attendedCount = team.members.filter((m) => m.attendedAt !== null).length;
        return {
          success: true,
          alreadyCheckedIn: true,
          attendedAt: member.attendedAt,
          registration: {
            id: member.id,
            studentName: member.fullName,
            rollNumber: member.rollNumber,
            teamName: team.name,
            eventTitle: event.title,
            teamProgress: `${attendedCount} of ${totalMembers} team members checked in`,
          },
          message: `Already checked in at ${formatTime24(member.attendedAt)}`,
        };
      }

      const attendedAt = new Date();
      const count = await AttendanceRepository.markTeamMemberAttended(member.id, organizerId, attendedAt);
      if (count === 0) {
        const fresh = await AttendanceRepository.findTeamMemberById(member.id);
        const original = fresh?.attendedAt || attendedAt;
        return {
          success: true,
          alreadyCheckedIn: true,
          attendedAt: original,
          registration: {
            id: member.id,
            studentName: member.fullName,
            rollNumber: member.rollNumber,
            teamName: team.name,
            eventTitle: event.title,
          },
          message: `Already checked in at ${formatTime24(original)}`,
        };
      }

      const attendedCount =
        team.members.filter((m) => m.attendedAt !== null || m.id === member.id).length;
      const progressStr = `${attendedCount} of ${totalMembers} team members checked in`;

      return {
        success: true,
        alreadyCheckedIn: false,
        attendedAt,
        registration: {
          id: member.id,
          studentName: member.fullName,
          rollNumber: member.rollNumber,
          teamName: team.name,
          eventTitle: event.title,
          teamProgress: progressStr,
        },
        message: `Checked in successfully (${progressStr})`,
      };
    }

    // Solo participant manual check-in
    const registration = await AttendanceRepository.findById(participantId);
    if (!registration) {
      return { success: false, code: "NOT_FOUND", message: "Registration not found" };
    }

    if (registration.eventId !== eventId) {
      return { success: false, code: "WRONG_EVENT", message: `Pass is for "${registration.event.title}"` };
    }

    const effectiveStatus = computeEffectiveEventStatus(registration.event);
    if (!isEventAttendanceAllowed(effectiveStatus)) {
      return {
        success: false,
        code: "EVENT_NOT_OPEN",
        message: `Check-in is not open for this event (status: ${effectiveStatus.toLowerCase()})`,
      };
    }

    if (registration.status !== "APPROVED") {
      return { success: false, code: "NOT_APPROVED", message: `Registration is ${registration.status.toLowerCase()}` };
    }

    const regSummary = {
      id: registration.id,
      studentName: registration.user.name,
      rollNumber: registration.user.rollNumber,
      teamName: null,
      eventTitle: registration.event.title,
    };

    if (registration.attendedAt) {
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: registration.attendedAt,
        registration: regSummary,
        message: `Already checked in at ${formatTime24(registration.attendedAt)}`,
      };
    }

    const attendedAt = new Date();
    const count = await AttendanceRepository.markRegistrationAttended(registration.id, organizerId, attendedAt);
    if (count === 0) {
      const fresh = await AttendanceRepository.findById(registration.id);
      const original = fresh?.attendedAt || attendedAt;
      return {
        success: true,
        alreadyCheckedIn: true,
        attendedAt: original,
        registration: regSummary,
        message: `Already checked in at ${formatTime24(original)}`,
      };
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      attendedAt,
      registration: regSummary,
      message: "Checked in successfully",
    };
  }

  /**
   * Undo check-in for a participant (solo registration or team member).
   */
  static async undoCheckIn({
    participantId,
    participantType,
  }: {
    participantId: string;
    participantType: "SOLO" | "TEAM_MEMBER";
  }) {
    if (participantType === "TEAM_MEMBER") {
      return AttendanceRepository.clearTeamMemberAttended(participantId);
    }
    return AttendanceRepository.clearRegistrationAttended(participantId);
  }

  /**
   * Get event attendance statistics and recent check-ins counting people.
   */
  static async getEventStats(eventId: string) {
    return AttendanceRepository.getEventAttendanceStats(eventId);
  }

  /**
   * Search approved participants for manual check-in.
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
