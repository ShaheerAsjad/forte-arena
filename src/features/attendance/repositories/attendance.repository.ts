import { prisma } from "@/lib/prisma";
import { isEventAttendanceAllowed } from "../attendance.config";
import { getEffectiveStatus } from "@/features/events/events.derived";
import type { EventStatus } from "@/lib/db-types";

export const attendanceRegistrationInclude = {
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      registrationDeadline: true,
      resultsPublished: true,
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
          checkInToken: true,
          attendedAt: true,
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

export type ParticipantTokenMatch =
  | {
      type: "TEAM_MEMBER";
      teamMember: {
        id: string;
        fullName: string;
        rollNumber: string;
        email: string | null;
        attendedAt: Date | null;
        attendedById: string | null;
        team: {
          id: string;
          name: string;
          eventId: string;
          event: {
            id: string;
            slug: string;
            title: string;
            venue: string;
            startsAt: Date;
            endsAt: Date | null;
            registrationDeadline?: Date | string;
            resultsPublished?: boolean;
            status: EventStatus;
          };
          members: Array<{
            id: string;
            fullName: string;
            rollNumber: string;
            email: string | null;
            attendedAt: Date | null;
          }>;
          registrations: Array<{
            id: string;
            status: string;
          }>;
        };
        attendedBy?: { id: string; name: string; email: string } | null;
      };
    }
  | {
      type: "REGISTRATION";
      registration: NonNullable<Awaited<ReturnType<typeof AttendanceRepository.findById>>>;
    };

export interface ManualSearchParticipant {
  id: string;
  participantType: "SOLO" | "TEAM_MEMBER";
  name: string;
  rollNumber: string | null;
  email: string | null;
  department: string | null;
  teamName: string | null;
  attendedAt: Date | null;
}

export class AttendanceRepository {
  /**
   * Find participant by check-in token (checks TeamMember first, then Registration).
   */
  static async findByToken(token: string): Promise<ParticipantTokenMatch | null> {
    // 1. Check TeamMember table first
    const teamMember = await prisma.teamMember.findUnique({
      where: { checkInToken: token },
      include: {
        team: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                title: true,
                venue: true,
                startsAt: true,
                endsAt: true,
                registrationDeadline: true,
                resultsPublished: true,
                status: true,
              },
            },
            members: {
              select: {
                id: true,
                fullName: true,
                rollNumber: true,
                email: true,
                attendedAt: true,
              },
            },
            registrations: {
              where: { status: "APPROVED" },
              select: { id: true, status: true },
              take: 1,
            },
          },
        },
        attendedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (teamMember) {
      return { type: "TEAM_MEMBER", teamMember };
    }

    // 2. Check Registration table (covers solo passes and legacy team passes)
    const registration = await prisma.registration.findUnique({
      where: { checkInToken: token },
      include: attendanceRegistrationInclude,
    });

    if (registration) {
      return { type: "REGISTRATION", registration };
    }

    return null;
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
   * Find a team member by ID.
   */
  static async findTeamMemberById(id: string) {
    return prisma.teamMember.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                title: true,
                venue: true,
                startsAt: true,
                endsAt: true,
                registrationDeadline: true,
                resultsPublished: true,
                status: true,
              },
            },
            members: {
              select: {
                id: true,
                fullName: true,
                rollNumber: true,
                email: true,
                attendedAt: true,
              },
            },
            registrations: {
              where: { status: "APPROVED" },
              select: { id: true, status: true },
              take: 1,
            },
          },
        },
        attendedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Atomically assign a generated token to a solo registration if checkInToken is currently null.
   */
  static async assignRegistrationToken(id: string, token: string): Promise<number> {
    const res = await prisma.registration.updateMany({
      where: { id, checkInToken: null },
      data: { checkInToken: token },
    });
    return res.count;
  }

  /**
   * Atomically assign a generated token to a team member if checkInToken is currently null.
   */
  static async assignTeamMemberToken(memberId: string, token: string): Promise<number> {
    const res = await prisma.teamMember.updateMany({
      where: { id: memberId, checkInToken: null },
      data: { checkInToken: token },
    });
    return res.count;
  }

  /**
   * Mark a solo registration as attended atomically where attendedAt is null and status is APPROVED.
   */
  static async markRegistrationAttended(id: string, organizerId: string, attendedAt: Date): Promise<number> {
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
   * Mark a team member as attended atomically where attendedAt is null.
   */
  static async markTeamMemberAttended(memberId: string, organizerId: string, attendedAt: Date): Promise<number> {
    const result = await prisma.teamMember.updateMany({
      where: {
        id: memberId,
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
   * Undo check-in for a solo registration.
   */
  static async clearRegistrationAttended(id: string) {
    return prisma.registration.update({
      where: { id },
      data: {
        attendedAt: null,
        attendedById: null,
      },
      select: { id: true, eventId: true },
    });
  }

  /**
   * Undo check-in for a team member.
   */
  static async clearTeamMemberAttended(memberId: string) {
    const member = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        attendedAt: null,
        attendedById: null,
      },
      select: {
        id: true,
        team: { select: { eventId: true } },
      },
    });

    return { id: member.id, eventId: member.team.eventId };
  }

  /**
   * Get attendance summary stats and recent check-ins for an event, counting PEOPLE.
   */
  static async getEventAttendanceStats(eventId: string) {
    const [
      soloApproved,
      soloAttended,
      teamApprovedMembers,
      teamAttendedMembers,
      recentSolo,
      recentTeam,
    ] = await Promise.all([
      // Solo approved
      prisma.registration.count({
        where: { eventId, status: "APPROVED", teamId: null },
      }),
      // Solo attended
      prisma.registration.count({
        where: { eventId, status: "APPROVED", teamId: null, attendedAt: { not: null } },
      }),
      // Team members in approved registrations
      prisma.teamMember.count({
        where: { team: { eventId, registrations: { some: { status: "APPROVED" } } } },
      }),
      // Team members attended
      prisma.teamMember.count({
        where: { team: { eventId, registrations: { some: { status: "APPROVED" } } }, attendedAt: { not: null } },
      }),
      // Recent solo attendees
      prisma.registration.findMany({
        where: { eventId, status: "APPROVED", teamId: null, attendedAt: { not: null } },
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
          attendedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
      // Recent team attendees
      prisma.teamMember.findMany({
        where: { team: { eventId, registrations: { some: { status: "APPROVED" } } }, attendedAt: { not: null } },
        orderBy: { attendedAt: "desc" },
        take: 30,
        select: {
          id: true,
          fullName: true,
          rollNumber: true,
          attendedAt: true,
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

    const totalApproved = soloApproved + teamApprovedMembers;
    const totalAttended = soloAttended + teamAttendedMembers;

    // Combine and sort recent check-ins by timestamp desc
    const combinedRecent = [
      ...recentSolo.map((r) => ({
        id: r.id,
        participantType: "SOLO" as const,
        name: r.user.name,
        rollNumber: r.user.rollNumber,
        department: r.user.department,
        teamName: null,
        attendedAt: r.attendedAt,
        attendedBy: r.attendedBy,
      })),
      ...recentTeam.map((m) => ({
        id: m.id,
        participantType: "TEAM_MEMBER" as const,
        name: m.fullName,
        rollNumber: m.rollNumber,
        department: null,
        teamName: m.team.name,
        attendedAt: m.attendedAt,
        attendedBy: m.attendedBy,
      })),
    ]
      .sort((a, b) => new Date(b.attendedAt!).getTime() - new Date(a.attendedAt!).getTime())
      .slice(0, 30);

    return {
      totalApproved,
      totalAttended,
      recentCheckIns: combinedRecent,
    };
  }

  /**
   * Search approved participants (both solo attendees and team members) by query.
   * Never leaks check-in tokens or phone numbers.
   */
  static async searchEventRegistrations(eventId: string, rawQuery: string): Promise<ManualSearchParticipant[]> {
    const query = rawQuery.trim();
    if (!query) return [];

    const [soloResults, teamMemberResults] = await Promise.all([
      // 1. Search solo registrations
      prisma.registration.findMany({
        where: {
          eventId,
          status: "APPROVED",
          teamId: null,
          OR: [
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { rollNumber: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          attendedAt: true,
          user: {
            select: {
              name: true,
              rollNumber: true,
              email: true,
              department: true,
            },
          },
        },
        take: 10,
      }),
      // 2. Search team members belonging to approved teams
      prisma.teamMember.findMany({
        where: {
          team: {
            eventId,
            registrations: { some: { status: "APPROVED" } },
          },
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { rollNumber: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { team: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          rollNumber: true,
          email: true,
          attendedAt: true,
          team: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    const formattedSolo: ManualSearchParticipant[] = soloResults.map((r) => ({
      id: r.id,
      participantType: "SOLO",
      name: r.user.name,
      rollNumber: r.user.rollNumber,
      email: r.user.email,
      department: r.user.department,
      teamName: null,
      attendedAt: r.attendedAt,
    }));

    const formattedTeam: ManualSearchParticipant[] = teamMemberResults.map((m) => ({
      id: m.id,
      participantType: "TEAM_MEMBER",
      name: m.fullName,
      rollNumber: m.rollNumber,
      email: m.email,
      department: null,
      teamName: m.team.name,
      attendedAt: m.attendedAt,
    }));

    return [...formattedSolo, ...formattedTeam].slice(0, 15);
  }

  /**
   * Get all events currently scannable by organizers.
   * Restricted to ATTENDANCE_ALLOWED_EVENT_STATUSES with approved registrations.
   */
  static async getScannableEvents() {
    const rawEvents = await prisma.event.findMany({
      where: {
        registrations: { some: { status: "APPROVED" } },
      },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        endsAt: true,
        registrationDeadline: true,
        resultsPublished: true,
        venue: true,
        status: true,
      },
    });

    const activeEvents = rawEvents.filter((ev) =>
      isEventAttendanceAllowed(getEffectiveStatus(ev))
    );

    const eventsWithCounts = await Promise.all(
      activeEvents.map(async (ev) => {
        const [soloCount, teamMemberCount] = await Promise.all([
          prisma.registration.count({
            where: { eventId: ev.id, status: "APPROVED", teamId: null },
          }),
          prisma.teamMember.count({
            where: {
              team: {
                eventId: ev.id,
                registrations: { some: { status: "APPROVED" } },
              },
            },
          }),
        ]);

        return {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          venue: ev.venue,
          status: getEffectiveStatus(ev),
          approvedPeopleCount: soloCount + teamMemberCount,
        };
      })
    );

    return eventsWithCounts;
  }
}
