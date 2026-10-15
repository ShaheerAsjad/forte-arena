import { describe, it, expect } from "vitest";
import { getEffectiveStatus } from "@/features/events/events.derived";
import { assertDeadlineNotPassed } from "@/features/registrations/registrations.rules";
import { AppError } from "@/lib/errors";

describe("getEffectiveStatus (Dynamic lifecycle resolution from dates)", () => {
  const baseEvent = {
    status: "PUBLISHED" as const,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
    endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // in 8 days
    registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
    resultsPublished: false,
  };

  it("preserves DRAFT regardless of past dates", () => {
    const draft = {
      ...baseEvent,
      status: "DRAFT" as const,
      startsAt: new Date(Date.now() - 100000),
      registrationDeadline: new Date(Date.now() - 200000),
    };
    expect(getEffectiveStatus(draft)).toBe("DRAFT");
  });

  it("preserves CANCELLED status", () => {
    const cancelled = {
      ...baseEvent,
      status: "CANCELLED" as const,
    };
    expect(getEffectiveStatus(cancelled)).toBe("CANCELLED");
  });

  it("returns COMPLETED when explicitly marked as COMPLETED in database", () => {
    const completed = {
      ...baseEvent,
      status: "COMPLETED" as const,
    };
    expect(getEffectiveStatus(completed)).toBe("COMPLETED");
  });

  it("returns COMPLETED when resultsPublished is true", () => {
    const resultsOut = {
      ...baseEvent,
      resultsPublished: true,
    };
    expect(getEffectiveStatus(resultsOut)).toBe("COMPLETED");
  });

  it("computes COMPLETED dynamically when endsAt is in the past", () => {
    const pastEnded = {
      ...baseEvent,
      status: "PUBLISHED" as const,
      startsAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 10 * 60 * 1000), // ended 10 mins ago
      registrationDeadline: new Date(Date.now() - 72 * 60 * 60 * 1000),
    };
    expect(getEffectiveStatus(pastEnded)).toBe("COMPLETED");
  });

  it("returns CLOSED when explicitly marked as CLOSED", () => {
    const closed = {
      ...baseEvent,
      status: "CLOSED" as const,
    };
    expect(getEffectiveStatus(closed)).toBe("CLOSED");
  });

  it("computes CLOSED dynamically when registrationDeadline has passed", () => {
    const deadlinePassed = {
      ...baseEvent,
      registrationDeadline: new Date(Date.now() - 5000), // passed 5 seconds ago
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // starts tomorrow
      endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    };
    expect(getEffectiveStatus(deadlinePassed)).toBe("CLOSED");
  });

  it("computes CLOSED dynamically when event has started (now >= startsAt)", () => {
    const ongoing = {
      ...baseEvent,
      registrationDeadline: new Date(Date.now() - 10000),
      startsAt: new Date(Date.now() - 5000), // started 5 seconds ago
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ends tomorrow
    };
    expect(getEffectiveStatus(ongoing)).toBe("CLOSED");
  });

  it("returns PUBLISHED when event is active and deadline is in the future", () => {
    const active = {
      ...baseEvent,
      status: "PUBLISHED" as const,
      registrationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    };
    expect(getEffectiveStatus(active)).toBe("PUBLISHED");
  });
});

describe("Server-side registration deadline enforcement", () => {
  it("allows registration when deadline is in the future", () => {
    const futureDeadline = new Date(Date.now() + 60 * 1000);
    expect(() => assertDeadlineNotPassed(futureDeadline)).not.toThrow();
  });

  it("strictly throws DEADLINE_PASSED AppError when deadline is in the past", () => {
    const pastDeadline = new Date(Date.now() - 1000);
    expect(() => assertDeadlineNotPassed(pastDeadline)).toThrow(AppError);

    try {
      assertDeadlineNotPassed(pastDeadline);
      expect.fail("Should have thrown AppError");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("DEADLINE_PASSED");
      expect(appErr.statusCode).toBe(400);
      expect(appErr.message).toBe("Registration deadline has passed for this event.");
    }
  });
});
