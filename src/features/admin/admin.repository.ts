import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegistrationStatus } from "@/lib/db-types";
import { AppError } from "@/lib/errors";

export interface AdminStats {
  totalEvents: number;
  publishedEvents: number;
  pendingRegistrations: number;
  approvedParticipants: number;
  averageRating: number;
  totalFeedback: number;
}

export interface DailyRegistrationCount {
  date: string;
  label: string;
  count: number;
}

export interface CategoryRegistrationCount {
  category: string;
  count: number;
  percentage: number;
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
    const [
      totalEvents,
      publishedEvents,
      pendingRegistrations,
      approvedRegistrations,
      feedbackAgg,
    ] = await Promise.all([
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
      prisma.feedback.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      totalEvents,
      publishedEvents,
      pendingRegistrations,
      approvedParticipants: approvedRegistrations,
      averageRating: feedbackAgg._avg.rating ?? 0,
      totalFeedback: feedbackAgg._count.rating ?? 0,
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
   * Registrations per day for the last N days (default 14 days)
   */
  static async getRegistrationsPerDay(days = 14): Promise<DailyRegistrationCount[]> {
    await connection();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const registrations = await prisma.registration.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Group counts by YYYY-MM-DD
    const countsMap = new Map<string, number>();
    for (const reg of registrations) {
      const d = new Date(reg.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    }

    const result: DailyRegistrationCount[] = [];
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    for (let i = 0; i < days; i++) {
      const curr = new Date(startDate);
      curr.setDate(startDate.getDate() + i);
      const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
      const label = `${months[curr.getMonth()]} ${curr.getDate()}`;
      result.push({
        date: key,
        label,
        count: countsMap.get(key) || 0,
      });
    }

    return result;
  }

  /**
   * Registrations breakdown by event category
   */
  static async getRegistrationsByCategory(): Promise<CategoryRegistrationCount[]> {
    await connection();
    const registrations = await prisma.registration.findMany({
      select: {
        event: {
          select: {
            category: true,
          },
        },
      },
    });

    const categoryCounts: Record<string, number> = {
      TECHNICAL: 0,
      SPORTS: 0,
      CULTURAL: 0,
      ACADEMIC: 0,
      GAMING: 0,
      OTHER: 0,
    };

    let total = 0;
    for (const reg of registrations) {
      const cat = reg.event?.category || "OTHER";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      total++;
    }

    const categories = ["TECHNICAL", "SPORTS", "CULTURAL", "ACADEMIC", "GAMING", "OTHER"];
    return categories.map((cat) => {
      const count = categoryCounts[cat] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        category: cat,
        count,
        percentage,
      };
    });
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

