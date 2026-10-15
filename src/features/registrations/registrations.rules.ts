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

// ────────────────────────────────────────────────────────────────
// Active registrations & Re-application rules
// ────────────────────────────────────────────────────────────────

export const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

export function isActiveRegistration(status: RegistrationStatus): boolean {
  return ACTIVE_REGISTRATION_STATUSES.includes(status);
}

export const MAX_REGISTRATION_ATTEMPTS = 2;

export function parseRegistrationAttempts(
  registrationOrNotes?:
    | {
        attemptCount?: number | null;
        notes?: string | null;
      }
    | string
    | null
): number {
  if (!registrationOrNotes) return 1;
  if (typeof registrationOrNotes === "object") {
    if (typeof registrationOrNotes.attemptCount === "number") {
      return registrationOrNotes.attemptCount;
    }
    return parseRegistrationAttempts(registrationOrNotes.notes);
  }
  const match = registrationOrNotes.match(/attempts?:(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 1;
}

export function assertCanRegister(
  existing: {
    status: RegistrationStatus;
    attemptCount?: number | null;
    withdrawCount?: number | null;
    notes?: string | null;
  } | null
): void {
  if (!existing) return;

  // Active registrations (PENDING, APPROVED, REJECTED) block new registration
  if (isActiveRegistration(existing.status)) {
    throw new ConflictError("You already have an active registration for this event.");
  }

  // If WITHDRAWN, check attempt limit using real columns with fallback to legacy notes
  const withdrawCount = existing.withdrawCount ?? 0;
  const attemptCount =
    existing.attemptCount ??
    (existing.notes?.match(/attempts?:(\d+)/i)
      ? parseInt(existing.notes.match(/attempts?:(\d+)/i)![1], 10)
      : 1);

  if (withdrawCount >= MAX_REGISTRATION_ATTEMPTS || attemptCount >= MAX_REGISTRATION_ATTEMPTS) {
    throw new AppError(
      "You have reached the maximum limit of 2 registration attempts for this event.",
      "MAX_ATTEMPTS_EXCEEDED",
      400
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Duplicate checks across active teams for an event
// ────────────────────────────────────────────────────────────────

export function assertTeamNameAvailable(
  proposedName: string,
  existingTeams: Array<{
    name: string;
    hasActiveRegistrations: boolean;
  }>
): void {
  const normalizedProposed = proposedName.trim().toUpperCase();
  for (const team of existingTeams) {
    if (
      team.hasActiveRegistrations &&
      team.name.trim().toUpperCase() === normalizedProposed
    ) {
      throw new ConflictError("This team name is already taken for this event");
    }
  }
}

export function assertRollNumbersAvailable(
  proposedRollNumbers: string[],
  activeRollNumbers: string[]
): void {
  const activeSet = new Set(
    activeRollNumbers.map((rn) => rn.trim().toUpperCase())
  );
  for (const rn of proposedRollNumbers) {
    const normalized = rn.trim().toUpperCase();
    if (activeSet.has(normalized)) {
      throw new ConflictError(
        `Roll number ${rn.trim()} is already in another team for this event`
      );
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Prisma unique constraint error mapping
// ────────────────────────────────────────────────────────────────

export function mapPrismaError(err: unknown): string {
  if (
    err instanceof Error &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    const meta = (
      err as {
        message?: string;
        meta?: {
          target?: string[] | string;
          modelName?: string;
          driverAdapterError?: {
            cause?: {
              originalMessage?: string;
              constraint?: { index?: string };
              table?: string;
            };
          };
        };
      }
    ).meta;
    const target = Array.isArray(meta?.target)
      ? meta.target.join(",")
      : String(meta?.target ?? "");
    const modelName = String(meta?.modelName ?? "");
    const driverMsg = String(
      meta?.driverAdapterError?.cause?.originalMessage ?? ""
    );
    const constraintIndex = String(
      meta?.driverAdapterError?.cause?.constraint?.index ?? ""
    );
    const table = String(meta?.driverAdapterError?.cause?.table ?? "");
    const errMessage = err instanceof Error ? err.message : "";

    if (
      target.includes("name") ||
      modelName === "Team" ||
      table === "teams" ||
      driverMsg.includes("teams_eventId_name_key") ||
      constraintIndex.includes("teams_eventId_name_key") ||
      errMessage.includes("teams_eventId_name_key")
    ) {
      return "This team name is already taken for this event";
    }

    if (
      target.includes("rollNumber") ||
      modelName === "TeamMember" ||
      table === "team_members" ||
      driverMsg.includes("team_members") ||
      constraintIndex.includes("team_members") ||
      errMessage.includes("team_members")
    ) {
      const match =
        driverMsg.match(/Key \((?:rollNumber|roll_number)\)=\(([^)]+)\)/i) ||
        errMessage.match(/Key \((?:rollNumber|roll_number)\)=\(([^)]+)\)/i);
      if (match && match[1]) {
        return `Roll number ${match[1].trim()} is already in another team for this event`;
      }
      return "Roll number is already in another team for this event";
    }

    if (
      target.includes("userId") ||
      modelName === "Registration" ||
      table === "registrations" ||
      driverMsg.includes("registrations_eventId_userId_key") ||
      constraintIndex.includes("registrations_eventId_userId_key") ||
      errMessage.includes("registrations_eventId_userId_key")
    ) {
      return "You are already registered for this event";
    }

    return "A record with this information already exists. This may be a duplicate registration or team name.";
  }
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}


