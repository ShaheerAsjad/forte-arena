/**
 * Pure, side-effect-free business rules for registrations.
 * All helpers in this file are testable without a database.
 */

import { ConflictError, AppError } from "@/lib/errors";
import type { RegistrationStatus } from "@/lib/db-types";

// ────────────────────────────────────────────────────────────────
// Deadline & seat checks
// ────────────────────────────────────────────────────────────────

export function assertDeadlineNotPassed(registrationDeadline: Date): void {
  if (new Date() > registrationDeadline) {
    throw new AppError(
      "Registration deadline has passed for this event.",
      "DEADLINE_PASSED",
      400
    );
  }
}

export function assertEventPublished(status: string): void {
  if (status !== "PUBLISHED") {
    throw new AppError(
      "This event is not open for registration.",
      "EVENT_NOT_PUBLISHED",
      400
    );
  }
}

export function assertSeatsAvailable(
  maxParticipants: number | null,
  currentApproved: number
): void {
  if (maxParticipants !== null && currentApproved >= maxParticipants) {
    throw new AppError(
      "This event has reached its maximum participant capacity.",
      "EVENT_FULL",
      400
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Team-specific checks
// ────────────────────────────────────────────────────────────────

export function assertTeamSize(
  memberCount: number,
  minTeamSize: number,
  maxTeamSize: number
): void {
  if (memberCount < minTeamSize) {
    throw new AppError(
      `Team must have at least ${minTeamSize} member(s) (including the leader). You have ${memberCount}.`,
      "TEAM_TOO_SMALL",
      400
    );
  }
  if (memberCount > maxTeamSize) {
    throw new AppError(
      `Team must have at most ${maxTeamSize} member(s). You have ${memberCount}.`,
      "TEAM_TOO_LARGE",
      400
    );
  }
}

export function assertNoDuplicateRollNumbers(
  rollNumbers: string[]
): void {
  const seen = new Set<string>();
  for (const rn of rollNumbers) {
    const normalized = rn.trim().toUpperCase();
    if (seen.has(normalized)) {
      throw new ConflictError(
        `Duplicate roll number detected: ${rn}. Each team member must have a unique roll number.`
      );
    }
    seen.add(normalized);
  }
}

// ────────────────────────────────────────────────────────────────
// Withdraw check
// ────────────────────────────────────────────────────────────────

export function assertWithdrawAllowed(
  status: RegistrationStatus,
  registrationDeadline: Date
): void {
  const withdrawableStatuses: RegistrationStatus[] = ["PENDING", "APPROVED"];
  if (!withdrawableStatuses.includes(status)) {
    throw new AppError(
      "Only PENDING or APPROVED registrations can be withdrawn.",
      "WITHDRAW_NOT_ALLOWED",
      400
    );
  }
  if (new Date() > registrationDeadline) {
    throw new AppError(
      "The registration deadline has passed; withdrawals are no longer allowed.",
      "DEADLINE_PASSED",
      400
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Team Leader in Team verification check
// ────────────────────────────────────────────────────────────────

export function assertLeaderInTeam(
  team: {
    leaderId: string;
    members: Array<{ rollNumber: string }>;
    registrations?: Array<{ userId: string }>;
  },
  expectedLeader: { id: string; rollNumber: string }
): void {
  if (team.leaderId !== expectedLeader.id) {
    throw new AppError(
      "Team leader ID mismatch.",
      "LEADER_MISMATCH",
      500
    );
  }
  const hasMember = team.members.some(
    (m) => m.rollNumber.trim().toUpperCase() === expectedLeader.rollNumber.trim().toUpperCase()
  );
  if (!hasMember) {
    throw new AppError(
      "Team leader was not found in team members list.",
      "LEADER_NOT_IN_MEMBERS",
      500
    );
  }
  if (team.registrations && !team.registrations.some((r) => r.userId === expectedLeader.id)) {
    throw new AppError(
      "Team leader does not have a registration pointing to the team.",
      "LEADER_REGISTRATION_MISSING",
      500
    );
  }
}

