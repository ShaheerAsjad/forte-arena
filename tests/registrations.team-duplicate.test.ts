import { describe, it, expect } from "vitest";
import {
  assertTeamNameAvailable,
  assertRollNumbersAvailable,
  assertCanRegister,
  mapPrismaError,
} from "@/features/registrations/registrations.rules";
import { ConflictError } from "@/lib/errors";

describe("Team Registration Duplicate & Re-Application Regression Tests", () => {
  const teamName = "TEAM MED";
  const rollNumbers = ["27", "11", "22", "33", "44"];

  describe("Register team -> withdraw -> register again with same name & roll numbers", () => {
    it("allows re-registering the same team name and roll numbers after earlier attempt was withdrawn", () => {
      // 1. Initial attempt was withdrawn
      const previousRegistration = {
        status: "WITHDRAWN" as const,
        notes: "attempt:1|withdrawn:1",
      };

      // Can register attempt 2
      expect(() => assertCanRegister(previousRegistration)).not.toThrow();

      // Team name availability check: previous team is withdrawn (no active registrations)
      const existingTeams = [
        {
          name: teamName,
          hasActiveRegistrations: false,
        },
      ];
      expect(() =>
        assertTeamNameAvailable(teamName, existingTeams)
      ).not.toThrow();

      // Case-insensitive & trimmed matching also allowed when previous is withdrawn
      expect(() =>
        assertTeamNameAvailable("  team med  ", existingTeams)
      ).not.toThrow();

      // Roll numbers availability check: no other active teams have these roll numbers
      const activeRollNumbers: string[] = [];
      expect(() =>
        assertRollNumbersAvailable(rollNumbers, activeRollNumbers)
      ).not.toThrow();
    });
  });

  describe("Same name while the first team is active", () => {
    it("throws a clear team-name error when team name is already taken by an active team", () => {
      const activeTeams = [
        {
          name: "TEAM MED",
          hasActiveRegistrations: true,
        },
      ];

      expect(() =>
        assertTeamNameAvailable("TEAM MED", activeTeams)
      ).toThrow(ConflictError);
      expect(() =>
        assertTeamNameAvailable("TEAM MED", activeTeams)
      ).toThrow("This team name is already taken for this event");

      // Case-insensitive duplicate check
      expect(() =>
        assertTeamNameAvailable("team med", activeTeams)
      ).toThrow("This team name is already taken for this event");

      // Leading/trailing whitespace duplicate check
      expect(() =>
        assertTeamNameAvailable("  team med  ", activeTeams)
      ).toThrow("This team name is already taken for this event");
    });
  });

  describe("Duplicate roll number while another team is active", () => {
    it("throws a clear roll-number error when a roll number is already in another active team", () => {
      const activeRollNumbers = ["11", "99"];

      expect(() =>
        assertRollNumbersAvailable(["27", "11", "22"], activeRollNumbers)
      ).toThrow(ConflictError);
      expect(() =>
        assertRollNumbersAvailable(["27", "11", "22"], activeRollNumbers)
      ).toThrow("Roll number 11 is already in another team for this event");

      // Case-insensitive roll number check
      expect(() =>
        assertRollNumbersAvailable(["cs-11"], ["CS-11"])
      ).toThrow("Roll number cs-11 is already in another team for this event");
    });
  });

  describe("Prisma P2002 Error Mapping", () => {
    it("maps duplicate team name P2002 error to specific message", () => {
      const error = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: {
          modelName: "Team",
          target: ["eventId", "name"],
          driverAdapterError: {
            cause: {
              originalMessage:
                'duplicate key value violates unique constraint "teams_eventId_name_key"',
            },
          },
        },
      });

      expect(mapPrismaError(error)).toBe(
        "This team name is already taken for this event"
      );
    });

    it("maps duplicate registration P2002 error to specific message", () => {
      const error = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: {
          modelName: "Registration",
          target: ["eventId", "userId"],
          driverAdapterError: {
            cause: {
              originalMessage:
                'duplicate key value violates unique constraint "registrations_eventId_userId_key"',
            },
          },
        },
      });

      expect(mapPrismaError(error)).toBe(
        "You are already registered for this event"
      );
    });

    it("maps duplicate team name P2002 error from pg driver adapter with constraint index", () => {
      const error = Object.assign(
        new Error(
          "Unique constraint failed on the constraint: teams_eventId_name_key"
        ),
        {
          code: "P2002",
          meta: {
            driverAdapterError: {
              name: "DriverAdapterError",
              cause: {
                originalCode: "23505",
                originalMessage:
                  'duplicate key value violates unique constraint "teams_eventId_name_key"',
                constraint: {
                  index: "teams_eventId_name_key",
                },
                table: "teams",
              },
            },
            modelName: "Team",
          },
        }
      );

      expect(mapPrismaError(error)).toBe(
        "This team name is already taken for this event"
      );
    });

    it("maps duplicate roll number P2002 error with specific roll number when in driver message", () => {
      const error = Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: {
          modelName: "TeamMember",
          target: ["rollNumber"],
          driverAdapterError: {
            cause: {
              originalMessage:
                "duplicate key value violates unique constraint: Key (rollNumber)=(11) already exists.",
            },
          },
        },
      });

      expect(mapPrismaError(error)).toBe(
        "Roll number 11 is already in another team for this event"
      );
    });
  });
});
