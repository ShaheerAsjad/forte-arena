import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export const announcementSelect = {
  id: true,
  title: true,
  body: true,
  pinned: true,
  publishedAt: true,
} as const;

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: Date;
};

export class AnnouncementsRepository {
  static async getLatestAnnouncements(limit = 4): Promise<AnnouncementItem[]> {
    await connection();
    return prisma.announcement.findMany({
      select: announcementSelect,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: limit,
    });
  }
}
