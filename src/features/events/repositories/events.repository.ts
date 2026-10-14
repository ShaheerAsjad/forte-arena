import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EventCategory, EventStatus, ParticipationType } from "@/generated/prisma";

export const eventCardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  category: true,
  status: true,
  participationType: true,
  minTeamSize: true,
  maxTeamSize: true,
  maxParticipants: true,
  startsAt: true,
  endsAt: true,
  registrationDeadline: true,
  posterUrl: true,
  venue: true,
  _count: {
    select: {
      registrations: {
        where: { status: "APPROVED" as const },
      },
    },
  },
} as const;

export type EventCardItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: EventCategory;
  status: EventStatus;
  participationType: ParticipationType;
  minTeamSize: number;
  maxTeamSize: number;
  maxParticipants: number | null;
  startsAt: Date;
  endsAt: Date | null;
  registrationDeadline: Date;
  posterUrl: string | null;
  venue: string;
  _count: {
    registrations: number;
  };
};

export const eventDetailSelect = {
  ...eventCardSelect,
  description: true,
  rules: true,
  eligibility: true,
  prizes: true,
  resultsPublished: true,
} as const;

export type EventDetailItem = EventCardItem & {
  description: string;
  rules: string;
  eligibility: string;
  prizes: string;
  resultsPublished: boolean;
};

export interface EventsQueryFilters {
  search?: string;
  category?: EventCategory;
  status?: EventStatus;
  page?: number;
  pageSize?: number;
}

export class EventsRepository {
  /**
   * Fetch featured events for the home hero/carousel
   */
  static async getFeaturedEvents(limit = 6): Promise<EventCardItem[]> {
    await connection();
    return prisma.event.findMany({
      where: {
        status: { in: ["PUBLISHED", "CLOSED", "COMPLETED"] },
      },
      select: eventCardSelect,
      orderBy: { startsAt: "asc" },
      take: limit,
    });
  }

  /**
   * Fetch the earliest upcoming published event for the live countdown hero card
   */
  static async getNextUpcomingEvent(): Promise<EventCardItem | null> {
    await connection();
    const now = new Date();
    return prisma.event.findFirst({
      where: {
        status: "PUBLISHED",
        startsAt: { gt: now },
      },
      select: eventCardSelect,
      orderBy: { startsAt: "asc" },
    });
  }

  /**
   * Paginated events list with search and filtering
   */
  static async getPaginatedEvents(filters: EventsQueryFilters) {
    await connection();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(24, Math.max(1, filters.pageSize ?? 9));
    const skip = (page - 1) * pageSize;

    const where: NonNullable<Parameters<typeof prisma.event.findMany>[0]>["where"] = {
      status: filters.status
        ? filters.status
        : { in: ["PUBLISHED", "CLOSED", "COMPLETED"] },
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        select: eventCardSelect,
        orderBy: { startsAt: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      events,
      total,
      page,
      currentPage: page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Fetch single event by unique slug
   */
  static async getEventBySlug(slug: string): Promise<EventDetailItem | null> {
    await connection();
    return prisma.event.findUnique({
      where: { slug },
      select: eventDetailSelect,
    });
  }

  /**
   * Fetch related events in the same category
   */
  static async getRelatedEvents(
    category: EventCategory,
    currentSlug: string,
    limit = 3
  ): Promise<EventCardItem[]> {
    await connection();
    return prisma.event.findMany({
      where: {
        category,
        slug: { not: currentSlug },
        status: { in: ["PUBLISHED", "CLOSED", "COMPLETED"] },
      },
      select: eventCardSelect,
      orderBy: { startsAt: "asc" },
      take: limit,
    });
  }
}
