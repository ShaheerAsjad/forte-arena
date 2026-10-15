import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/db-types";
import { AppError } from "@/lib/errors";

export interface AdminStats {
  totalEvents: number;
  publishedEvents: number;
  pendingRegistrations: number;
  approvedParticipants: number;
}

export interface AdminRecentRegistration {
  id: string;
  status: RegistrationStatus;
  createdAt: Date;
  notes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    rollNumber: string | null;
    department: string | null;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    participationType: "INDIVIDUAL" | "TEAM";
  };
  team: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      fullName: string;
      rollNumber: string;
    }>;
  } | null;
}

export class AdminRepository {
  /**
   * Fetch overview statistics for the organizer console.
   */
  static async getAdminStats(): Promise<AdminStats> {
    await connection();
    const [totalEvents, publishedEvents, pendingRegistrations, approvedRegistrations] =
      await Promise.all([
        prisma.event.count(),
        prisma.event.count({
          where: { status: "PUBLISHED" },
        }),
        prisma.registration.count({
          where: { status: "PENDING" },
        }),
        prisma.registration.count({
          where: { status: "APPROVED" },
        }),
      ]);

    return {
      totalEvents,
      publishedEvents,
      pendingRegistrations,
      approvedParticipants: approvedRegistrations,
    };
  }

  /**
   * Fetch recent registrations across all events.
   */
  static async getRecentRegistrations(limit = 10): Promise<AdminRecentRegistration[]> {
    await connection();
    const rows = await prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        notes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            participationType: true,
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
              },
            },
          },
        },
      },
    });

    return rows as unknown as AdminRecentRegistration[];
  }

  /**
   * Approves a participant registration safely inside a database transaction.
   * Employs row-level locking (SELECT ... FOR UPDATE on "events") to serialize
   * concurrent approval attempts and prevent oversubscribing capacity.
   */
  static async approveRegistrationWithLock(
    registrationId: string,
    reviewerId: string
  ): Promise<{ id: string; event: { id: string; slug: string } }> {
    return prisma.$transaction(async (tx) => {
      const reg = await tx.registration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              maxParticipants: true,
            },
          },
        },
      });

      if (!reg) {
        throw new AppError("Registration not found.", "NOT_FOUND", 404);
      }

      // If already approved, return without error
      if (reg.status === "APPROVED") {
        return reg;
      }

      // Lock the event row in PostgreSQL to serialize concurrent approvals for this event
      await tx.$queryRaw`SELECT id FROM "events" WHERE id = ${reg.eventId} FOR UPDATE`;

      // Re-check capacity inside transaction while event lock is held
      if (reg.event.maxParticipants !== null) {
        const currentApproved = await tx.registration.count({
          where: {
            eventId: reg.eventId,
            status: "APPROVED",
          },
        });

        if (currentApproved >= reg.event.maxParticipants) {
          throw new AppError(
            `Event capacity reached (${reg.event.maxParticipants} max participants). Cannot approve additional registrations.`,
            "EVENT_FULL",
            400
          );
        }
      }

      return tx.registration.update({
        where: { id: registrationId },
        data: {
          status: "APPROVED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      });
    });
  }
}

