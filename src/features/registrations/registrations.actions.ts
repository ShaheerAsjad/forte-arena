"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ConflictError, AppError } from "@/lib/errors";
import { RegistrationsRepository } from "./repositories/registrations.repository";
import { EventsRepository } from "@/features/events/repositories/events.repository";
import {
  assertDeadlineNotPassed,
  assertEventPublished,
  assertSeatsAvailable,
  assertTeamSize,
  assertNoDuplicateRollNumbers,
  assertWithdrawAllowed,
  assertLeaderInTeam,
  assertCanRegister,
} from "./registrations.rules";

// ────────────────────────────────────────────────────────────────
// Simple in-memory rate limiter (per server instance, resets on restart)
// ────────────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    throw new AppError(
      "Too many registration attempts. Please wait a minute and try again.",
      "RATE_LIMITED",
      429
    );
  }
  entry.count++;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function mapPrismaError(err: unknown): string {
  if (
    err instanceof Error &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return new ConflictError(
      "A record with this information already exists. This may be a duplicate registration or team name."
    ).message;
  }
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

// ────────────────────────────────────────────────────────────────
// Zod Schemas
// ────────────────────────────────────────────────────────────────

const teamMemberSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  rollNumber: z.string().min(1, "Roll number is required").max(30),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

const individualRegisterSchema = z.object({
  eventSlug: z.string().min(1),
});

const teamRegisterSchema = z.object({
  eventSlug: z.string().min(1),
  teamName: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(60, "Team name too long"),
  members: z
    .array(teamMemberSchema)
    .min(1, "At least one additional member is required"),
});

const withdrawSchema = z.object({
  registrationId: z.string().min(1),
});

// ────────────────────────────────────────────────────────────────
// Individual Registration
// ────────────────────────────────────────────────────────────────

export async function registerIndividual(
  payload: z.infer<typeof individualRegisterSchema>
): Promise<ActionResult<{ registrationId: string }>> {
  try {
    const user = await requireUser();
    checkRateLimit(`reg:individual:${user.id}`);

    const parsed = individualRegisterSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { eventSlug } = parsed.data;

    // Fetch event
    const event = await EventsRepository.getEventBySlug(eventSlug);
    if (!event) return { ok: false, error: "Event not found." };

    // Business rules
    assertEventPublished(event.status);
    assertDeadlineNotPassed(event.registrationDeadline);
    const approved = await RegistrationsRepository.countApprovedRegistrations(event.id);
    assertSeatsAvailable(event.maxParticipants, approved);

    // Check duplicate or withdrawal attempt limit
    const existing = await RegistrationsRepository.findExistingRegistration(event.id, user.id);
    assertCanRegister(existing);

    // Check profile completeness
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { rollNumber: true, department: true, phone: true },
    });
    if (!dbUser?.rollNumber || !dbUser.department || !dbUser.phone) {
      return { ok: false, error: "Please complete your profile before registering." };
    }

    const isReapplying = existing && existing.status === "WITHDRAWN";
    const notes = isReapplying ? "attempt:2|withdrawn:1" : "attempt:1";

    const registration = await RegistrationsRepository.createIndividualRegistration(
      event.id,
      user.id,
      notes
    );

    revalidatePath(`/events/${eventSlug}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { registrationId: registration.id } };
  } catch (err) {
    return { ok: false, error: mapPrismaError(err) };
  }
}

// ────────────────────────────────────────────────────────────────
// Team Registration
// ────────────────────────────────────────────────────────────────

export async function registerTeam(
  payload: z.infer<typeof teamRegisterSchema>
): Promise<ActionResult<{ registrationId: string }>> {
  try {
    const user = await requireUser();
    checkRateLimit(`reg:team:${user.id}`);

    const parsed = teamRegisterSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { eventSlug, teamName, members } = parsed.data;

    const event = await EventsRepository.getEventBySlug(eventSlug);
    if (!event) return { ok: false, error: "Event not found." };

    assertEventPublished(event.status);
    assertDeadlineNotPassed(event.registrationDeadline);
    const approved = await RegistrationsRepository.countApprovedRegistrations(event.id);
    assertSeatsAvailable(event.maxParticipants, approved);

    // Check profile
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { rollNumber: true, department: true, phone: true, name: true, email: true },
    });
    if (!dbUser?.rollNumber || !dbUser.department || !dbUser.phone) {
      return { ok: false, error: "Please complete your profile before registering." };
    }

    // Check duplicate or withdrawal attempt limit for leader
    const existing = await RegistrationsRepository.findExistingRegistration(event.id, user.id);
    assertCanRegister(existing);

    const isReapplying = existing && existing.status === "WITHDRAWN";
    const notes = isReapplying ? "attempt:2|withdrawn:1" : "attempt:1";

    // Team size: leader counts as 1 + additional members
    const totalMembers = 1 + members.length;
    assertTeamSize(totalMembers, event.minTeamSize, event.maxTeamSize);

    // Check for duplicate roll numbers (including leader)
    const allRollNumbers = [
      dbUser.rollNumber,
      ...members.map((m) => m.rollNumber),
    ];
    assertNoDuplicateRollNumbers(allRollNumbers);

    // Create team + registration in transaction
    const { team, registration } = await RegistrationsRepository.createTeamRegistration({
      eventId: event.id,
      leaderId: user.id,
      teamName,
      leaderMember: {
        fullName: dbUser.name || "Leader",
        rollNumber: dbUser.rollNumber,
        email: dbUser.email || user.email || undefined,
        phone: dbUser.phone || undefined,
      },
      members: members.map((m) => ({
        fullName: m.fullName,
        rollNumber: m.rollNumber,
        email: m.email || undefined,
        phone: m.phone || undefined,
      })),
      notes,
    });

    // Verification check: re-fetch team and confirm current session user appears in it
    const createdTeam = await RegistrationsRepository.getTeamForVerification(team.id);
    if (!createdTeam) {
      throw new AppError("Team creation failed: could not re-fetch created team.", "TEAM_NOT_FOUND", 500);
    }
    assertLeaderInTeam(createdTeam, { id: user.id, rollNumber: dbUser.rollNumber });

    revalidatePath(`/events/${eventSlug}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { registrationId: registration.id } };
  } catch (err) {
    return { ok: false, error: mapPrismaError(err) };
  }
}

// ────────────────────────────────────────────────────────────────
// Withdraw Registration
// ────────────────────────────────────────────────────────────────

export async function withdrawRegistration(
  payload: z.infer<typeof withdrawSchema>
): Promise<ActionResult<{ registrationId: string }>> {
  try {
    const user = await requireUser();

    const parsed = withdrawSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: "Invalid input." };
    }
    const { registrationId } = parsed.data;

    const registration = await RegistrationsRepository.getRegistrationById(registrationId, user.id);
    if (!registration) {
      return { ok: false, error: "Registration not found." };
    }

    assertWithdrawAllowed(registration.status, registration.event.registrationDeadline);

    await RegistrationsRepository.withdrawRegistration(registrationId);

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${registrationId}`);
    revalidatePath(`/events/${registration.event.slug}`);
    return { ok: true, data: { registrationId } };
  } catch (err) {
    return { ok: false, error: mapPrismaError(err) };
  }
}
