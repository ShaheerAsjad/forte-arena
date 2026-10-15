import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EventCategory, EventStatus, ParticipationType } from "@/lib/db-types";

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
  score?: string | null;
  isTie?: boolean;
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

export type AdminEventResultRow = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  participationType: ParticipationType;
  startsAt: Date;
  endsAt: Date | null;
  venue: string;
  resultsPublished: boolean;
  resultCount: number;
  approvedCount: number;
  statusBadge: "NO_RESULTS" | "DRAFT" | "PUBLISHED";
};

export type AdminApprovedRegistration = {
  id: string;
  userId: string;
  userName: string;
  rollNumber: string | null;
  department: string | null;
  teamId: string | null;
  teamName: string | null;
};

export type AdminResultDetail = {
  id: string;
  eventId: string;
  registrationId: string | null;
  customParticipantName: string | null;
  participantName: string;
  teamName: string | null;
  rollNumber: string | null;
  position: number;
  award: string | null;
  score: string | null;
  remarks: string | null;
  certificateUrl: string | null;
  isTie: boolean;
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
            score: true,
            isTie: true,
            customParticipantName: true,
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
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
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
      score: r.score,
      isTie: r.isTie,
      winnerName: r.registration?.user?.name ?? r.customParticipantName ?? "Competitor",
      teamName: r.registration?.team?.name ?? null,
      department: r.registration?.user?.department ?? null,
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
        customParticipantName: true,
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
      winnerName: r.registration?.user?.name ?? r.customParticipantName ?? "Champion",
      teamName: r.registration?.team?.name ?? null,
      award: r.award,
      position: r.position,
    }));
  }

  /**
   * Fetch events eligible for results management in the admin console:
   * Completed events or events past their start/end dates.
   */
  static async getAdminEligibleEvents(): Promise<AdminEventResultRow[]> {
    await connection();
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { status: "COMPLETED" },
          { endsAt: { lte: now } },
          { startsAt: { lte: now } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        status: true,
        participationType: true,
        startsAt: true,
        endsAt: true,
        venue: true,
        resultsPublished: true,
        _count: {
          select: {
            results: true,
            registrations: {
              where: { status: "APPROVED" },
            },
          },
        },
      },
      orderBy: [{ startsAt: "desc" }],
    });

    return events.map((ev) => {
      let statusBadge: "NO_RESULTS" | "DRAFT" | "PUBLISHED" = "NO_RESULTS";
      if (ev.resultsPublished) {
        statusBadge = "PUBLISHED";
      } else if (ev._count.results > 0) {
        statusBadge = "DRAFT";
      }

      return {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        category: ev.category,
        status: ev.status,
        participationType: ev.participationType,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        venue: ev.venue,
        resultsPublished: ev.resultsPublished,
        resultCount: ev._count.results,
        approvedCount: ev._count.registrations,
        statusBadge,
      };
    });
  }

  /**
   * Fetch full result manager payload for a single event in the admin console.
   */
  static async getAdminEventResultsData(eventId: string) {
    await connection();
    const [event, results, approvedRegistrations] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          category: true,
          status: true,
          participationType: true,
          startsAt: true,
          endsAt: true,
          venue: true,
          resultsPublished: true,
        },
      }),
      prisma.result.findMany({
        where: { eventId },
        select: {
          id: true,
          eventId: true,
          registrationId: true,
          customParticipantName: true,
          position: true,
          award: true,
          score: true,
          remarks: true,
          certificateUrl: true,
          isTie: true,
          registration: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  rollNumber: true,
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
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      prisma.registration.findMany({
        where: {
          eventId,
          status: "APPROVED",
        },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              name: true,
              rollNumber: true,
              department: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!event) return null;

    const formattedResults: AdminResultDetail[] = results.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
      participantName:
        r.registration?.user?.name ?? r.customParticipantName ?? "Walk-in Participant",
      teamName: r.registration?.team?.name ?? null,
      rollNumber: r.registration?.user?.rollNumber ?? null,
      position: r.position,
      award: r.award,
      score: r.score,
      remarks: r.remarks,
      certificateUrl: r.certificateUrl,
      isTie: r.isTie,
    }));

    const formattedApproved: AdminApprovedRegistration[] = approvedRegistrations.map((reg) => ({
      id: reg.id,
      userId: reg.userId,
      userName: reg.user.name,
      rollNumber: reg.user.rollNumber,
      department: reg.user.department,
      teamId: reg.team?.id ?? null,
      teamName: reg.team?.name ?? null,
    }));

    return {
      event,
      results: formattedResults,
      approvedRegistrations: formattedApproved,
    };
  }
}
