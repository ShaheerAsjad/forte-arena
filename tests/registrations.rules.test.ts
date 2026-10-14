import { describe, it, expect } from "vitest";
import {
  assertDeadlineNotPassed,
  assertEventPublished,
  assertSeatsAvailable,
  assertTeamSize,
  assertNoDuplicateRollNumbers,
  assertWithdrawAllowed,
} from "@/features/registrations/registrations.rules";
import { AppError, ConflictError } from "@/lib/errors";

// ────────────────────────────────────────────────────────────────
// assertDeadlineNotPassed
// ────────────────────────────────────────────────────────────────

describe("assertDeadlineNotPassed", () => {
  it("does not throw when deadline is in the future", () => {
    const future = new Date(Date.now() + 60_000);
    expect(() => assertDeadlineNotPassed(future)).not.toThrow();
  });

  it("throws AppError when deadline has passed", () => {
    const past = new Date(Date.now() - 60_000);
    expect(() => assertDeadlineNotPassed(past)).toThrow(AppError);
    expect(() => assertDeadlineNotPassed(past)).toThrow("deadline has passed");
  });
});

// ────────────────────────────────────────────────────────────────
// assertEventPublished
// ────────────────────────────────────────────────────────────────

describe("assertEventPublished", () => {
  it("does not throw when status is PUBLISHED", () => {
    expect(() => assertEventPublished("PUBLISHED")).not.toThrow();
  });

  it("throws for DRAFT", () => {
    expect(() => assertEventPublished("DRAFT")).toThrow(AppError);
  });

  it("throws for CLOSED", () => {
    expect(() => assertEventPublished("CLOSED")).toThrow(AppError);
  });

  it("throws for CANCELLED", () => {
    expect(() => assertEventPublished("CANCELLED")).toThrow(AppError);
  });
});

// ────────────────────────────────────────────────────────────────
// assertSeatsAvailable
// ────────────────────────────────────────────────────────────────

describe("assertSeatsAvailable", () => {
  it("does not throw when maxParticipants is null (unlimited)", () => {
    expect(() => assertSeatsAvailable(null, 9999)).not.toThrow();
  });

  it("does not throw when there are seats remaining", () => {
    expect(() => assertSeatsAvailable(100, 50)).not.toThrow();
  });

  it("throws when event is full (currentApproved === maxParticipants)", () => {
    expect(() => assertSeatsAvailable(10, 10)).toThrow(AppError);
    expect(() => assertSeatsAvailable(10, 10)).toThrow("maximum participant capacity");
  });

  it("throws when event is over-filled", () => {
    expect(() => assertSeatsAvailable(10, 15)).toThrow(AppError);
  });
});

// ────────────────────────────────────────────────────────────────
// assertTeamSize
// ────────────────────────────────────────────────────────────────

describe("assertTeamSize", () => {
  it("does not throw when size is within range", () => {
    expect(() => assertTeamSize(3, 2, 5)).not.toThrow();
    expect(() => assertTeamSize(2, 2, 5)).not.toThrow();
    expect(() => assertTeamSize(5, 2, 5)).not.toThrow();
  });

  it("throws when team is too small", () => {
    expect(() => assertTeamSize(1, 2, 5)).toThrow(AppError);
    expect(() => assertTeamSize(1, 2, 5)).toThrow("at least");
  });

  it("throws when team is too large", () => {
    expect(() => assertTeamSize(6, 2, 5)).toThrow(AppError);
    expect(() => assertTeamSize(6, 2, 5)).toThrow("at most");
  });
});

// ────────────────────────────────────────────────────────────────
// assertNoDuplicateRollNumbers
// ────────────────────────────────────────────────────────────────

describe("assertNoDuplicateRollNumbers", () => {
  it("does not throw with all unique roll numbers", () => {
    expect(() =>
      assertNoDuplicateRollNumbers(["2021-CS-001", "2021-CS-002", "2021-CS-003"])
    ).not.toThrow();
  });

  it("throws when there are duplicate roll numbers", () => {
    expect(() =>
      assertNoDuplicateRollNumbers(["2021-CS-001", "2021-CS-002", "2021-CS-001"])
    ).toThrow(ConflictError);
  });

  it("is case-insensitive when detecting duplicates", () => {
    expect(() =>
      assertNoDuplicateRollNumbers(["2021-cs-001", "2021-CS-001"])
    ).toThrow(ConflictError);
  });

  it("ignores leading/trailing whitespace when detecting duplicates", () => {
    expect(() =>
      assertNoDuplicateRollNumbers(["2021-CS-001", " 2021-CS-001 "])
    ).toThrow(ConflictError);
  });
});

// ────────────────────────────────────────────────────────────────
// assertWithdrawAllowed
// ────────────────────────────────────────────────────────────────

describe("assertWithdrawAllowed", () => {
  const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pastDeadline = new Date(Date.now() - 60_000);

  it("allows withdraw when PENDING and deadline in future", () => {
    expect(() => assertWithdrawAllowed("PENDING", futureDeadline)).not.toThrow();
  });

  it("allows withdraw when APPROVED and deadline in future", () => {
    expect(() => assertWithdrawAllowed("APPROVED", futureDeadline)).not.toThrow();
  });

  it("throws when status is REJECTED", () => {
    expect(() => assertWithdrawAllowed("REJECTED", futureDeadline)).toThrow(AppError);
    expect(() => assertWithdrawAllowed("REJECTED", futureDeadline)).toThrow("PENDING or APPROVED");
  });

  it("throws when status is WITHDRAWN", () => {
    expect(() => assertWithdrawAllowed("WITHDRAWN", futureDeadline)).toThrow(AppError);
  });

  it("throws when deadline has passed even if status is PENDING", () => {
    expect(() => assertWithdrawAllowed("PENDING", pastDeadline)).toThrow(AppError);
    expect(() => assertWithdrawAllowed("PENDING", pastDeadline)).toThrow("deadline has passed");
  });
});
