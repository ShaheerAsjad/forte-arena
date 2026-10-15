import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/db-types";
import { ConflictError } from "@/lib/errors";
import { assertRollNumbersAvailable } from "../registrations.rules";

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
      select: {
        id: true,
        status: true,
        notes: true,
        attemptCount: true,
        withdrawCount: true,
      },
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
    userId: string
  ) {
    return prisma.registration.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        eventId,
        userId,
        status: "PENDING",
        attemptCount: 1,
        withdrawCount: 0,
      },
      update: {
        teamId: null,
        status: "PENDING",
        attemptCount: { increment: 1 },
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
        notes: null,
      },
      select: { id: true, status: true },
    });
  }

  /**
   * Create a team + team members + leader registration in a single transaction.
   * Handles re-registration if leader previously withdrew, replacing any old withdrawn team.
   * Prevents duplicates against other ACTIVE teams (PENDING/APPROVED/REJECTED).
   */
  static async createTeamRegistration(payload: {
    eventId: string;
    leaderId: string;
    teamName: string;
    leaderMember: { fullName: string; rollNumber: string; email?: string; phone?: string };
    members: Array<{ fullName: string; rollNumber: string; email?: string; phone?: string }>;
  }) {
    const trimmedTeamName = payload.teamName.trim();

    return prisma.$transaction(async (tx) => {
      // 1. If leader previously had a team that was withdrawn, clean up the old team
      const existingLeaderReg = await tx.registration.findUnique({
        where: {
          eventId_userId: {
            eventId: payload.eventId,
            userId: payload.leaderId,
          },
        },
        select: { id: true, status: true, teamId: true },
      });

      if (existingLeaderReg?.teamId) {
        await tx.team.deleteMany({
          where: { id: existingLeaderReg.teamId },
        });
      }

      // 2. Check if a team with this name exists for this event
      const existingTeamWithName = await tx.team.findFirst({
        where: {
          eventId: payload.eventId,
          name: { equals: trimmedTeamName, mode: "insensitive" },
        },
        include: {
          registrations: {
            select: { id: true, status: true },
          },
        },
      });

      if (existingTeamWithName) {
        const hasActiveRegistrations = existingTeamWithName.registrations.some((r) =>
          ["PENDING", "APPROVED", "REJECTED"].includes(r.status)
        );
        if (hasActiveRegistrations) {
          throw new ConflictError("This team name is already taken for this event");
        }
        // If it's a withdrawn/abandoned team, delete it so it doesn't block unique constraint
        await tx.team.delete({
          where: { id: existingTeamWithName.id },
        });
      }

      // 3. Check for duplicate roll numbers across other ACTIVE teams
      const proposedRollNumbers = [
        payload.leaderMember.rollNumber.trim(),
        ...payload.members.map((m) => m.rollNumber.trim()),
      ];

      const activeMembers = await tx.teamMember.findMany({
        where: {
          team: {
            eventId: payload.eventId,
            registrations: {
              some: {
                status: { in: ["PENDING", "APPROVED", "REJECTED"] },
                userId: { not: payload.leaderId },
              },
            },
          },
        },
        select: {
          rollNumber: true,
        },
      });

      const activeRollNumbers = activeMembers.map((am) => am.rollNumber);
      assertRollNumbersAvailable(proposedRollNumbers, activeRollNumbers);

      // 4. Put leader as the first member of the team
      const allMembers = [
        {
          fullName: payload.leaderMember.fullName.trim(),
          rollNumber: payload.leaderMember.rollNumber.trim(),
          email: payload.leaderMember.email,
          phone: payload.leaderMember.phone,
        },
        ...payload.members.map((m) => ({
          fullName: m.fullName.trim(),
          rollNumber: m.rollNumber.trim(),
          email: m.email,
          phone: m.phone,
        })),
      ];

      const team = await tx.team.create({
        data: {
          eventId: payload.eventId,
          leaderId: payload.leaderId,
          name: trimmedTeamName,
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
          attemptCount: 1,
          withdrawCount: 0,
        },
        update: {
          teamId: team.id,
          status: "PENDING",
          attemptCount: { increment: 1 },
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
          notes: null,
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
   * If this registration was for a team, removes the team so its name and roll numbers
   * no longer block re-application or other teams.
   */
  static async withdrawRegistration(registrationId: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.registration.findUnique({
        where: { id: registrationId },
        select: { teamId: true },
      });

      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: "WITHDRAWN",
          withdrawCount: { increment: 1 },
          teamId: null,
        },
        select: { id: true, status: true },
      });

      if (current?.teamId) {
        // Delete the withdrawn team (cascading team members)
        await tx.team.deleteMany({
          where: { id: current.teamId },
        });
      }

      return reg;
    });
  }
}
