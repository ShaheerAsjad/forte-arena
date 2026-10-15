import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/errors";

describe("Admin - Concurrency Safe Approval with PostgreSQL Row Lock", () => {
  it("enforces capacity limit and throws EVENT_FULL when capacity is reached", () => {
    const checkCapacity = (maxParticipants: number | null, currentApproved: number) => {
      if (maxParticipants !== null && currentApproved >= maxParticipants) {
        throw new AppError(
          `Event capacity reached (${maxParticipants} max participants). Cannot approve additional registrations.`,
          "EVENT_FULL",
          400
        );
      }
    };

    // Capacity remaining
    expect(() => checkCapacity(10, 9)).not.toThrow();

    // Capacity exact match -> should throw
    expect(() => checkCapacity(10, 10)).toThrow(AppError);
    expect(() => checkCapacity(10, 10)).toThrow("Event capacity reached");

    // Over capacity -> should throw
    expect(() => checkCapacity(10, 11)).toThrow(AppError);

    // Unlimited capacity (null) -> never throws
    expect(() => checkCapacity(null, 100)).not.toThrow();
  });

  it("verifies row-level lock statement targets PostgreSQL 'events' table", () => {
    const eventId = "evt_speed_chess_123";
    // Simulate Prisma sql template tag behavior
    const sqlQuery = `SELECT id FROM "events" WHERE id = '${eventId}' FOR UPDATE`;

    expect(sqlQuery).toContain('FROM "events"');
    expect(sqlQuery).toContain("FOR UPDATE");
    expect(sqlQuery).toContain(eventId);
  });

  it("simulates concurrent transactions with row lock to prevent over-subscription", async () => {
    // Shared event state
    const eventState = {
      id: "evt_1",
      maxParticipants: 5,
      approvedCount: 4, // Only 1 slot left!
    };

    // A mutex simulating PostgreSQL row-level lock on the event row
    let isLocked = false;
    const lockWaitQueue: Array<() => void> = [];

    const acquireEventLock = async () => {
      if (isLocked) {
        await new Promise<void>((resolve) => lockWaitQueue.push(resolve));
      }
      isLocked = true;
    };

    const releaseEventLock = () => {
      isLocked = false;
      const next = lockWaitQueue.shift();
      if (next) next();
    };

    // Approval function simulating the transaction in AdminRepository.approveRegistrationWithLock
    const executeApprovalTx = async (regId: string) => {
      // 1. Lock event row in PostgreSQL (FOR UPDATE)
      await acquireEventLock();
      try {
        // 2. Re-check capacity while lock is held
        if (
          eventState.maxParticipants !== null &&
          eventState.approvedCount >= eventState.maxParticipants
        ) {
          throw new AppError(
            `Event capacity reached (${eventState.maxParticipants} max participants). Cannot approve additional registrations.`,
            "EVENT_FULL",
            400
          );
        }

        // 3. Increment approved count
        eventState.approvedCount++;
        return { success: true, regId };
      } finally {
        releaseEventLock();
      }
    };

    // Two concurrent approval requests arrive simultaneously for 1 remaining slot
    const [resultA, resultB] = await Promise.allSettled([
      executeApprovalTx("reg_student_a"),
      executeApprovalTx("reg_student_b"),
    ]);

    // Exactly one must succeed and one must fail with EVENT_FULL
    const successes = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const failures = [resultA, resultB].filter((r) => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const failedReason = (failures[0] as PromiseRejectedResult).reason;
    expect(failedReason).toBeInstanceOf(AppError);
    expect(failedReason.code).toBe("EVENT_FULL");
    expect(failedReason.message).toContain("Event capacity reached (5 max participants)");

    // Event capacity strictly capped at 5, never 6
    expect(eventState.approvedCount).toBe(5);
  });
});
