import { describe, it, expect } from "vitest";
import { assertLeaderInTeam } from "@/features/registrations/registrations.rules";
import { AppError } from "@/lib/errors";

describe("Team Registration Leader Regression Tests", () => {
  const sessionUser = {
    id: "usr_session_leader_123",
    rollNumber: "CS-2024-001",
  };

  it("passes when the leader is saved as a TeamMember and has their own registration", () => {
    const validTeam = {
      leaderId: "usr_session_leader_123",
      members: [
        { fullName: "Test Leader", rollNumber: "CS-2024-001" },
        { fullName: "Teammate One", rollNumber: "CS-2024-002" },
      ],
      registrations: [
        { userId: "usr_session_leader_123" },
      ],
    };

    expect(() => assertLeaderInTeam(validTeam, sessionUser)).not.toThrow();
  });

  it("handles case-insensitive roll number matching for the leader", () => {
    const teamWithLowerRoll = {
      leaderId: "usr_session_leader_123",
      members: [
        { fullName: "Test Leader", rollNumber: "cs-2024-001" },
        { fullName: "Teammate One", rollNumber: "CS-2024-002" },
      ],
      registrations: [
        { userId: "usr_session_leader_123" },
      ],
    };

    expect(() => assertLeaderInTeam(teamWithLowerRoll, sessionUser)).not.toThrow();
  });

  it("throws LEADER_NOT_IN_MEMBERS when leader is missing from team members", () => {
    // This represents the bug where only additional members were inserted into team.members
    const buggyTeam = {
      leaderId: "usr_session_leader_123",
      members: [
        { fullName: "Teammate One", rollNumber: "CS-2024-002" },
        { fullName: "Teammate Two", rollNumber: "CS-2024-003" },
      ],
      registrations: [
        { userId: "usr_session_leader_123" },
      ],
    };

    expect(() => assertLeaderInTeam(buggyTeam, sessionUser)).toThrow(AppError);
    expect(() => assertLeaderInTeam(buggyTeam, sessionUser)).toThrow(
      "Team leader was not found in team members list."
    );
  });

  it("throws LEADER_MISMATCH when team leaderId does not match the authenticated session user", () => {
    const spoofedTeam = {
      leaderId: "usr_attacker_999",
      members: [
        { fullName: "Test Leader", rollNumber: "CS-2024-001" },
      ],
      registrations: [
        { userId: "usr_session_leader_123" },
      ],
    };

    expect(() => assertLeaderInTeam(spoofedTeam, sessionUser)).toThrow(AppError);
    expect(() => assertLeaderInTeam(spoofedTeam, sessionUser)).toThrow(
      "Team leader ID mismatch."
    );
  });

  it("throws LEADER_REGISTRATION_MISSING when leader has no registration pointing to the team", () => {
    const orphanedTeam = {
      leaderId: "usr_session_leader_123",
      members: [
        { fullName: "Test Leader", rollNumber: "CS-2024-001" },
      ],
      registrations: [
        { userId: "some_other_user_456" },
      ],
    };

    expect(() => assertLeaderInTeam(orphanedTeam, sessionUser)).toThrow(AppError);
    expect(() => assertLeaderInTeam(orphanedTeam, sessionUser)).toThrow(
      "Team leader does not have a registration pointing to the team."
    );
  });
});
