import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EventCategory } from "@/lib/db-types";

export type PublishedResultEvent = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  startsAt: Date;
  posterUrl: string | null;
  venue: string;
  results: {
    id: string;
    position: number;
    award: string | null;
  }[];
};

export type RankedResultItem = {
  id: string;
  position: number;
  award: string | null;
  certificateUrl: string | null;
  remarks: string | null;
  winnerName: string;
  teamName: string | null;
  department: string | null;
};

export type EventWithResults = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: EventCategory;
  startsAt: Date;
  posterUrl: string | null;
  venue: string;
  results: RankedResultItem[];
};

export type SpotlightWinner = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  category: EventCategory;
  winnerName: string;
  teamName: string | null;
  award: string | null;
  position: number;
};

export class ResultsRepository {
  /**
   * Fetch all events that have published results
   */
  static async getPublishedResultsEvents(): Promise<PublishedResultEvent[]> {
    await connection();
    return prisma.event.findMany({
      where: {
        resultsPublished: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        startsAt: true,
        posterUrl: true,
        venue: true,
        results: {
          select: {
            id: true,
            position: true,
            award: true,
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { startsAt: "desc" },
    });
  }

  /**
   * Fetch full results for a single event by slug
   */
  static async getEventResults(slug: string): Promise<EventWithResults | null> {
    await connection();
    const event = await prisma.event.findFirst({
      where: {
        slug,
        resultsPublished: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        startsAt: true,
        posterUrl: true,
        venue: true,
        results: {
          select: {
            id: true,
            position: true,
            award: true,
            certificateUrl: true,
            remarks: true,
            registration: {
              select: {
                user: {
                  select: {
                    name: true,
                    department: true,
                  },
                },
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!event) return null;

    const formattedResults: RankedResultItem[] = event.results.map((r) => ({
      id: r.id,
      position: r.position,
      award: r.award,
      certificateUrl: r.certificateUrl,
      remarks: r.remarks,
      winnerName: r.registration.user.name,
      teamName: r.registration.team?.name ?? null,
      department: r.registration.user.department,
    }));

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      category: event.category,
      startsAt: event.startsAt,
      posterUrl: event.posterUrl,
      venue: event.venue,
      results: formattedResults,
    };
  }

  /**
   * Fetch 1st place / top winners for the homepage spotlight
   */
  static async getRecentSpotlightWinners(limit = 3): Promise<SpotlightWinner[]> {
    await connection();
    const results = await prisma.result.findMany({
      where: {
        position: 1,
        event: {
          resultsPublished: true,
        },
      },
      select: {
        award: true,
        position: true,
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
          },
        },
        registration: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return results.map((r) => ({
      eventId: r.event.id,
      eventSlug: r.event.slug,
      eventTitle: r.event.title,
      category: r.event.category,
      winnerName: r.registration.user.name,
      teamName: r.registration.team?.name ?? null,
      award: r.award,
      position: r.position,
    }));
  }
}
