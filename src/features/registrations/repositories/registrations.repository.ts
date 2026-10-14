import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/db-types";

// ────────────────────────────────────────────────────────────────
// Selects
// ────────────────────────────────────────────────────────────────

export const registrationCardSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  rejectionReason: true,
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      participationType: true,
      startsAt: true,
      registrationDeadline: true,
      venue: true,
      posterUrl: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      members: {
        select: {
          id: true,
          fullName: true,
          rollNumber: true,
          email: true,
          phone: true,
        },
      },
    },
  },
} as const;

export type RegistrationCard = {
  id: string;
  status: RegistrationStatus;
  createdAt: Date;
  updatedAt: Date;
  rejectionReason: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    category: string;
    participationType: string;
    startsAt: Date;
    registrationDeadline: Date;
    venue: string;
    posterUrl: string | null;
  };
  team: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      fullName: string;
      rollNumber: string;
      email: string | null;
      phone: string | null;
    }>;
  } | null;
};

// ────────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────────

export class RegistrationsRepository {
  /**
   * Get all registrations for a user, newest first.
   */
  static async getUserRegistrations(userId: string): Promise<RegistrationCard[]> {
    await connection();
    return prisma.registration.findMany({
      where: { userId },
      select: registrationCardSelect,
      orderBy: { createdAt: "desc" },
    }) as unknown as RegistrationCard[];
  }

  /**
   * Get a single registration by id, including ownership check.
   */
  static async getRegistrationById(
    registrationId: string,
    userId: string
  ): Promise<RegistrationCard | null> {
    await connection();
    return prisma.registration.findFirst({
      where: { id: registrationId, userId },
      select: registrationCardSelect,
    }) as unknown as RegistrationCard | null;
  }

  /**
   * Check if user is already registered for an event.
   */
  static async findExistingRegistration(
    eventId: string,
    userId: string
  ) {
    await connection();
    return prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true, notes: true },
    });
  }

  /**
   * Count approved registrations for an event (for seat checks).
   */
  static async countApprovedRegistrations(eventId: string): Promise<number> {
    await connection();
    return prisma.registration.count({
      where: { eventId, status: "APPROVED" },
    });
  }

  /**
   * Create or re-apply an individual registration.
   */
  static async createIndividualRegistration(
    eventId: string,
    userId: string,
    notes = "attempt:1"
  ) {
    return prisma.registration.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        eventId,
        userId,
        status: "PENDING",
        notes,
      },
      update: {
        teamId: null,
        status: "PENDING",
        notes,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
      select: { id: true, status: true },
    });
  }

  /**
   * Create a team + team members + leader registration in a single transaction.
   * Handles re-registration if leader previously withdrew.
   */
  static async createTeamRegistration(payload: {
    eventId: string;
    leaderId: string;
    teamName: string;
    leaderMember: { fullName: string; rollNumber: string; email?: string; phone?: string };
    members: Array<{ fullName: string; rollNumber: string; email?: string; phone?: string }>;
    notes?: string;
  }) {
    const notes = payload.notes || "attempt:1";
    return prisma.$transaction(async (tx) => {
      // Put leader as the first member of the team
      const allMembers = [
        {
          fullName: payload.leaderMember.fullName,
          rollNumber: payload.leaderMember.rollNumber,
          email: payload.leaderMember.email,
          phone: payload.leaderMember.phone,
        },
        ...payload.members,
      ];

      const team = await tx.team.create({
        data: {
          eventId: payload.eventId,
          leaderId: payload.leaderId,
          name: payload.teamName,
          members: {
            create: allMembers,
          },
        },
        select: { id: true },
      });

      const registration = await tx.registration.upsert({
        where: {
          eventId_userId: {
            eventId: payload.eventId,
            userId: payload.leaderId,
          },
        },
        create: {
          eventId: payload.eventId,
          userId: payload.leaderId,
          teamId: team.id,
          status: "PENDING",
          notes,
        },
        update: {
          teamId: team.id,
          status: "PENDING",
          notes,
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
        },
        select: { id: true, status: true, teamId: true },
      });

      return { team, registration };
    });
  }

  /**
   * Re-fetch team with members and registrations to verify creation.
   */
  static async getTeamForVerification(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        registrations: true,
      },
    });
  }

  /**
   * Withdraw (soft-delete by status update) a registration and record withdrawal note.
   */
  static async withdrawRegistration(registrationId: string) {
    const current = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { notes: true },
    });
    const currentAttempts = current?.notes?.match(/attempt:(\d+)/)?.[1] || "1";
    const withdrawalNote = `attempt:${currentAttempts}|withdrawn:${currentAttempts}`;

    return prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: "WITHDRAWN",
        notes: withdrawalNote,
      },
      select: { id: true, status: true },
    });
  }
}
