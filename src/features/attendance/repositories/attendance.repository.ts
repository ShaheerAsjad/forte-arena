import { prisma } from "@/lib/prisma";

export const attendanceRegistrationInclude = {
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      rollNumber: true,
      department: true,
      phone: true,
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
          email: true,
          phone: true,
        },
      },
    },
  },
  attendedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export const manualSearchSelect = {
  id: true,
  status: true,
  attendedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      rollNumber: true,
      email: true,
      department: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export class AttendanceRepository {
  /**
   * Find a registration by check-in token.
   */
  static async findByToken(token: string) {
    return prisma.registration.findUnique({
      where: { checkInToken: token },
      include: attendanceRegistrationInclude,
    });
  }

  /**
   * Find a registration by ID with full attendance relations.
   */
  static async findById(id: string) {
    return prisma.registration.findUnique({
      where: { id },
      include: attendanceRegistrationInclude,
    });
  }

  /**
   * Assign a generated token to a registration.
   */
  static async assignCheckInToken(id: string, token: string) {
    return prisma.registration.update({
      where: { id },
      data: { checkInToken: token },
      include: attendanceRegistrationInclude,
    });
  }

  /**
   * Mark a registration as attended atomically where attendedAt is null and status is APPROVED.
   * Returns the count of updated rows (1 if successfully updated, 0 if already attended or not approved).
   */
  static async markAttended(id: string, organizerId: string, attendedAt: Date): Promise<number> {
    const result = await prisma.registration.updateMany({
      where: {
        id,
        status: "APPROVED",
        attendedAt: null,
      },
      data: {
        attendedAt,
        attendedById: organizerId,
      },
    });

    return result.count;
  }

  /**
   * Undo check-in for a registration.
   */
  static async clearAttended(id: string) {
    return prisma.registration.update({
      where: { id },
      data: {
        attendedAt: null,
        attendedById: null,
      },
      include: attendanceRegistrationInclude,
    });
  }

  /**
   * Get attendance summary stats and recent check-ins for an event.
   */
  static async getEventAttendanceStats(eventId: string) {
    const [totalApproved, totalAttended, recentCheckIns] = await Promise.all([
      prisma.registration.count({
        where: { eventId, status: "APPROVED" },
      }),
      prisma.registration.count({
        where: { eventId, status: "APPROVED", attendedAt: { not: null } },
      }),
      prisma.registration.findMany({
        where: { eventId, attendedAt: { not: null } },
        orderBy: { attendedAt: "desc" },
        take: 30,
        select: {
          id: true,
          attendedAt: true,
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
          attendedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      totalApproved,
      totalAttended,
      recentCheckIns,
    };
  }

  /**
   * Search approved registrations for an event by query (roll number, name, email, team, or token).
   * Uses manualSearchSelect to return only safe display fields (never leaks tokens or private phone numbers).
   */
  static async searchEventRegistrations(eventId: string, rawQuery: string) {
    const query = rawQuery.trim();
    if (!query) return [];

    return prisma.registration.findMany({
      where: {
        eventId,
        status: "APPROVED",
        OR: [
          { checkInToken: query },
          { user: { name: { contains: query, mode: "insensitive" } } },
          { user: { rollNumber: { contains: query, mode: "insensitive" } } },
          { user: { email: { contains: query, mode: "insensitive" } } },
          { team: { name: { contains: query, mode: "insensitive" } } },
          {
            team: {
              members: {
                some: {
                  OR: [
                    { fullName: { contains: query, mode: "insensitive" } },
                    { rollNumber: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      },
      select: manualSearchSelect,
      take: 10,
    });
  }

  /**
   * Get all events an organizer can scan (published, ongoing, or having approved registrations).
   */
  static async getScannableEvents() {
    return prisma.event.findMany({
      where: {
        OR: [
          { status: { in: ["PUBLISHED", "DRAFT"] } },
          { registrations: { some: { status: "APPROVED" } } },
        ],
      },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        endsAt: true,
        venue: true,
        status: true,
        _count: {
          select: {
            registrations: {
              where: { status: "APPROVED" },
            },
          },
        },
      },
    });
  }
}
