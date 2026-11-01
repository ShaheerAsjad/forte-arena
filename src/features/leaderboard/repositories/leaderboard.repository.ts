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
  isTeam?: boolean;
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
            teamId: true,
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
      const isTeam = Boolean(r.registration?.teamId || r.registration?.team);
      let teamName: string | null = null;
      const participants: RawLeaderboardParticipant[] = [];

      if (isTeam && r.registration?.team) {
        const team = r.registration.team;
        teamName = team.name;

        const seenKeys = new Set<string>();

        // 1. Process team.members
        if (team.members && team.members.length > 0) {
          for (const m of team.members) {
            const normRoll = m.rollNumber ? m.rollNumber.trim().toUpperCase() : "";
            const normEmail = m.email ? m.email.trim().toLowerCase() : "";

            const matchedUser =
              (normRoll ? userByRoll.get(normRoll) : undefined) ||
              (normEmail ? userByEmail.get(normEmail) : undefined);

            const isLeaderMatch =
              (team.leader && team.leader.rollNumber && normRoll === team.leader.rollNumber.trim().toUpperCase()) ||
              (team.leader && team.leader.id && matchedUser?.id === team.leader.id);

            const userId = matchedUser?.id || (isLeaderMatch ? team.leader.id : undefined);
            const dept = matchedUser?.department ?? (isLeaderMatch ? resolveDepartmentLabel(team.leader.department) : null);
            const name = m.fullName || matchedUser?.name || (isLeaderMatch ? team.leader.name : "Team Member");
            const roll = m.rollNumber?.trim() || (isLeaderMatch ? team.leader.rollNumber : null);

            const memberKey = normRoll ? `roll:${normRoll}` : userId ? `user:${userId}` : `name:${name.trim().toLowerCase()}`;
            if (!seenKeys.has(memberKey)) {
              seenKeys.add(memberKey);
              participants.push({
                userId,
                name,
                rollNumber: roll || null,
                department: dept,
              });
            }
          }
        }

        // 2. Ensure team.leader is included if not already in participants
        if (team.leader) {
          const leaderNormRoll = team.leader.rollNumber ? team.leader.rollNumber.trim().toUpperCase() : "";
          const leaderKey = leaderNormRoll ? `roll:${leaderNormRoll}` : `user:${team.leader.id}`;
          if (!seenKeys.has(leaderKey)) {
            seenKeys.add(leaderKey);
            participants.push({
              userId: team.leader.id,
              name: team.leader.name,
              rollNumber: team.leader.rollNumber,
              department: resolveDepartmentLabel(team.leader.department),
            });
          }
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
        isTeam,
        teamName,
        event: r.event,
        participants,
      };
    });
  }
}
