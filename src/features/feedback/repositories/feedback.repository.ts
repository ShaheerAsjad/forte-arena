import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateFeedbackDistribution, type FeedbackDistribution } from "../feedback.rules";

export interface FeedbackListItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  };
}

export class FeedbackRepository {
  /**
   * Get feedback for a specific user and event
   */
  static async getUserFeedbackForEvent(userId: string, eventId: string) {
    await connection();
    return prisma.feedback.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });
  }

  /**
   * Upsert feedback (handles initial submission and editing)
   */
  static async upsertFeedback(data: {
    userId: string;
    eventId: string;
    rating: number;
    comment?: string | null;
  }) {
    await connection();
    return prisma.feedback.upsert({
      where: {
        eventId_userId: {
          eventId: data.eventId,
          userId: data.userId,
        },
      },
      create: {
        eventId: data.eventId,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      update: {
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });
  }

  /**
   * Get feedback list for admin view, optionally filtered by event
   */
  static async getFeedbackList(eventId?: string): Promise<FeedbackListItem[]> {
    await connection();
    return prisma.feedback.findMany({
      where: eventId && eventId !== "ALL" ? { eventId } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
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
          },
        },
      },
    });
  }

  /**
   * Calculate aggregated distribution and metrics, optionally filtered by event
   */
  static async getFeedbackStats(eventId?: string): Promise<FeedbackDistribution> {
    await connection();
    const rows = await prisma.feedback.findMany({
      where: eventId && eventId !== "ALL" ? { eventId } : undefined,
      select: { rating: true },
    });

    return calculateFeedbackDistribution(rows);
  }

  /**
   * Get list of events that have any feedback or are completed
   */
  static async getEventsForFilter() {
    await connection();
    return prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
      },
    });
  }
}
