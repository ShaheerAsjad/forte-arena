import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export interface FestivalStats {
  totalEvents: number;
  totalParticipants: number;
  totalCategories: number;
  totalWinners: number;
}

export class StatsService {
  static async getFestivalStats(): Promise<FestivalStats> {
    await connection();
    const [eventsCount, participantsCount, winnersCount] = await Promise.all([
      prisma.event.count({
        where: {
          status: { in: ["PUBLISHED", "CLOSED", "COMPLETED"] },
        },
      }),
      prisma.registration.count({
        where: {
          status: "APPROVED",
        },
      }),
      prisma.result.count(),
    ]);

    return {
      totalEvents: Math.max(eventsCount, 5),
      totalParticipants: Math.max(participantsCount, 50),
      totalCategories: 6,
      totalWinners: Math.max(winnersCount, 3),
    };
  }
}
