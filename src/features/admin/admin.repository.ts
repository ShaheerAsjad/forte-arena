import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/db-types";

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
}
