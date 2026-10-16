import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export type PublicAnnouncementItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  isVisible: boolean;
  publishedAt: Date;
  createdAt: Date;
  linkUrl: string | null;
  linkLabel: string | null;
  eventId: string | null;
  event: {
    id: string;
    title: string;
    slug: string;
  } | null;
};

export type AdminAnnouncementItem = PublicAnnouncementItem & {
  createdBy: {
    id: string;
    name: string;
  };
};

export class AnnouncementsRepository {
  /**
   * Fetches latest visible announcements for the home bulletins strip.
   */
  static async getLatestAnnouncements(limit = 4): Promise<PublicAnnouncementItem[]> {
    await connection();
    return prisma.announcement.findMany({
      where: { isVisible: true },
      select: {
        id: true,
        title: true,
        body: true,
        pinned: true,
        isVisible: true,
        publishedAt: true,
        createdAt: true,
        linkUrl: true,
        linkLabel: true,
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  }

  /**
   * Fetches paginated visible announcements for the public /announcements page.
   */
  static async getPublicAnnouncements({
    page = 1,
    pageSize = 9,
  }: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PublicAnnouncementItem[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    await connection();
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where: { isVisible: true },
        select: {
          id: true,
          title: true,
          body: true,
          pinned: true,
          isVisible: true,
          publishedAt: true,
          createdAt: true,
          linkUrl: true,
          linkLabel: true,
          eventId: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.announcement.count({
        where: { isVisible: true },
      }),
    ]);

    return {
      items,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      currentPage: safePage,
    };
  }

  /**
   * Fetches visible announcements related to a specific event for the event detail "Updates" block.
   */
  static async getAnnouncementsForEvent(
    eventId: string
  ): Promise<PublicAnnouncementItem[]> {
    await connection();
    return prisma.announcement.findMany({
      where: {
        eventId,
        isVisible: true,
      },
      select: {
        id: true,
        title: true,
        body: true,
        pinned: true,
        isVisible: true,
        publishedAt: true,
        createdAt: true,
        linkUrl: true,
        linkLabel: true,
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    });
  }

  /**
   * Admin console: fetches all announcements (visible and hidden) with creator info.
   */
  static async getAllAnnouncementsAdmin(): Promise<AdminAnnouncementItem[]> {
    await connection();
    return prisma.announcement.findMany({
      select: {
        id: true,
        title: true,
        body: true,
        pinned: true,
        isVisible: true,
        publishedAt: true,
        createdAt: true,
        linkUrl: true,
        linkLabel: true,
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
  }
}
