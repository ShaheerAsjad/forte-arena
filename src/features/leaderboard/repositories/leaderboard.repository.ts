import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EventCategory } from "@/lib/db-types";
import { resolveDepartmentLabel } from "@/features/profile/academic.config";

export interface RawLeaderboardParticipant {
  userId?: string | null;
  name: string;
  rollNumber: string | null;
  department: string | null;
}

export interface RawLeaderboardResultItem {
  id: string;
  position: number;
  award: string | null;
  teamName: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    category: EventCategory;
    startsAt: Date;
    resultsPublished: boolean;
  };
  participants: RawLeaderboardParticipant[];
}

export class LeaderboardRepository {
  /**
   * Fetches all published competition results across all events.
   * Strips out emails, phone numbers, and other sensitive details.
   */
  static async getPublishedResults(): Promise<RawLeaderboardResultItem[]> {
    await connection();

    const results = await prisma.result.findMany({
      where: {
        event: {
          resultsPublished: true,
        },
      },
      select: {
        id: true,
        position: true,
        award: true,
        customParticipantName: true,
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            startsAt: true,
            resultsPublished: true,
          },
        },
        registration: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
                department: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                leader: {
                  select: {
                    id: true,
                    name: true,
                    rollNumber: true,
                    department: true,
                  },
                },
                members: {
                  select: {
                    id: true,
                    fullName: true,
                    rollNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ event: { startsAt: "desc" } }, { position: "asc" }],
    });

    // Collect candidate roll numbers and emails from team members across published results
    const candidateRolls = new Set<string>();
    const candidateEmails = new Set<string>();

    for (const r of results) {
      const members = r.registration?.team?.members;
      if (members && members.length > 0) {
        for (const m of members) {
          if (m.rollNumber?.trim()) {
            candidateRolls.add(m.rollNumber.trim());
          }
          if (m.email?.trim()) {
            candidateEmails.add(m.email.trim());
          }
        }
      }
    }

    // Only query users if there are candidate team members to match
    let matchedUsers: Array<{
      id: string;
      name: string;
      rollNumber: string | null;
      department: string | null;
      email: string;
    }> = [];

    if (candidateRolls.size > 0 || candidateEmails.size > 0) {
      const rollQueryIn = new Set<string>();
      for (const r of candidateRolls) {
        rollQueryIn.add(r);
        rollQueryIn.add(r.toUpperCase());
        rollQueryIn.add(r.toLowerCase());
      }

      const emailQueryIn = new Set<string>();
      for (const e of candidateEmails) {
        emailQueryIn.add(e);
        emailQueryIn.add(e.toLowerCase());
        emailQueryIn.add(e.toUpperCase());
      }

      matchedUsers = await prisma.user.findMany({
        where: {
          OR: [
            ...(rollQueryIn.size > 0
              ? [{ rollNumber: { in: Array.from(rollQueryIn) } }]
              : []),
            ...(emailQueryIn.size > 0
              ? [{ email: { in: Array.from(emailQueryIn) } }]
              : []),
          ],
        },
        select: {
          id: true,
          name: true,
          rollNumber: true,
          department: true,
          email: true,
        },
      });
    }

    // Build lookup maps for resolving departments of team members
    const userByRoll = new Map<string, { id: string; name: string; department: string | null }>();
    const userByEmail = new Map<string, { id: string; name: string; department: string | null }>();

    for (const u of matchedUsers) {
      const sanitizedDept = resolveDepartmentLabel(u.department);
      if (u.rollNumber) {
        userByRoll.set(u.rollNumber.trim().toUpperCase(), {
          id: u.id,
          name: u.name,
          department: sanitizedDept,
        });
      }
      if (u.email) {
        userByEmail.set(u.email.trim().toLowerCase(), {
          id: u.id,
          name: u.name,
          department: sanitizedDept,
        });
      }
    }

    return results.map((r) => {
      let teamName: string | null = null;
      const participants: RawLeaderboardParticipant[] = [];

      if (r.registration?.team) {
        const team = r.registration.team;
        teamName = team.name;

        // Process team members
        if (team.members && team.members.length > 0) {
          for (const m of team.members) {
            const normRoll = m.rollNumber ? m.rollNumber.trim().toUpperCase() : "";
            const normEmail = m.email ? m.email.trim().toLowerCase() : "";

            const matchedUser =
              (normRoll ? userByRoll.get(normRoll) : undefined) ||
              (normEmail ? userByEmail.get(normEmail) : undefined);

            participants.push({
              userId: matchedUser?.id,
              name: m.fullName || matchedUser?.name || "Team Member",
              rollNumber: m.rollNumber || null,
              department: matchedUser?.department || null,
            });
          }
        } else if (team.leader) {
          participants.push({
            userId: team.leader.id,
            name: team.leader.name,
            rollNumber: team.leader.rollNumber,
            department: resolveDepartmentLabel(team.leader.department),
          });
        }
      } else if (r.registration?.user) {
        participants.push({
          userId: r.registration.user.id,
          name: r.registration.user.name,
          rollNumber: r.registration.user.rollNumber,
          department: resolveDepartmentLabel(r.registration.user.department),
        });
      } else if (r.customParticipantName) {
        participants.push({
          name: r.customParticipantName,
          rollNumber: null,
          department: null,
        });
      }

      return {
        id: r.id,
        position: r.position,
        award: r.award,
        teamName,
        event: r.event,
        participants,
      };
    });
  }
}
