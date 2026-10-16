import { describe, it, expect } from "vitest";
import {
  checkFeedbackEligibility,
  calculateFeedbackDistribution,
  feedbackInputSchema,
} from "@/features/feedback/feedback.rules";
import type { EventStatus, RegistrationStatus } from "@/lib/db-types";

describe("Feedback Rules: Eligibility Checks", () => {
  const baseEvent = {
    status: "COMPLETED" as EventStatus,
    startsAt: new Date("2026-10-01T10:00:00Z"),
    endsAt: new Date("2026-10-01T18:00:00Z"),
    registrationDeadline: new Date("2026-09-28T23:59:59Z"),
    resultsPublished: true,
  };

  it("permits feedback when registration is APPROVED and event is COMPLETED", () => {
    const res = checkFeedbackEligibility({
      registrationStatus: "APPROVED",
      event: baseEvent,
    });
    expect(res.eligible).toBe(true);
  });

  it("permits feedback when event has past endsAt timestamp", () => {
    const pastEvent = {
      ...baseEvent,
      status: "PUBLISHED" as EventStatus,
      endsAt: new Date(Date.now() - 3600_000), // 1 hour ago
      resultsPublished: false,
    };
    const res = checkFeedbackEligibility({
      registrationStatus: "APPROVED",
      event: pastEvent,
    });
    expect(res.eligible).toBe(true);
  });

  it("permits feedback when event results have been published", () => {
    const publishedResultsEvent = {
      ...baseEvent,
      status: "CLOSED" as EventStatus,
      endsAt: null,
      resultsPublished: true,
    };
    const res = checkFeedbackEligibility({
      registrationStatus: "APPROVED",
      event: publishedResultsEvent,
    });
    expect(res.eligible).toBe(true);
  });

  it("rejects feedback if student registration is PENDING", () => {
    const res = checkFeedbackEligibility({
      registrationStatus: "PENDING" as RegistrationStatus,
      event: baseEvent,
    });
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain("Only approved participants");
  });

  it("rejects feedback if student registration is REJECTED", () => {
    const res = checkFeedbackEligibility({
      registrationStatus: "REJECTED" as RegistrationStatus,
      event: baseEvent,
    });
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain("Only approved participants");
  });

  it("rejects feedback if student registration is WITHDRAWN", () => {
    const res = checkFeedbackEligibility({
      registrationStatus: "WITHDRAWN" as RegistrationStatus,
      event: baseEvent,
    });
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain("Only approved participants");
  });

  it("rejects feedback if event is still active or in the future", () => {
    const futureEvent = {
      ...baseEvent,
      status: "PUBLISHED" as EventStatus,
      startsAt: new Date(Date.now() + 86400_000),
      endsAt: new Date(Date.now() + 172800_000),
      resultsPublished: false,
    };
    const res = checkFeedbackEligibility({
      registrationStatus: "APPROVED",
      event: futureEvent,
    });
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain("once the event is completed");
  });
});

describe("Feedback Rules: Zod Form Validation", () => {
  it("accepts valid feedback submission (rating 1 to 5 and optional comment)", () => {
    for (const r of [1, 2, 3, 4, 5]) {
      const parsed = feedbackInputSchema.safeParse({
        eventId: "evt-123",
        rating: r,
        comment: "Great competition!",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts null or omitted comment", () => {
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 4,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.comment).toBeNull();
  });

  it("rejects ratings below 1 star", () => {
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 0,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("at least 1 star");
  });

  it("rejects ratings above 5 stars", () => {
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 6,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("cannot exceed 5 stars");
  });

  it("rejects floating-point rating values", () => {
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 4.5,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("must be an integer");
  });

  it("rejects comments exceeding 1000 characters", () => {
    const longComment = "a".repeat(1001);
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 5,
      comment: longComment,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("cannot exceed 1000 characters");
  });

  it("accepts comment exactly 1000 characters", () => {
    const maxComment = "a".repeat(1000);
    const parsed = feedbackInputSchema.safeParse({
      eventId: "evt-123",
      rating: 5,
      comment: maxComment,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("Feedback Rules: Distribution & Analytics Math", () => {
  it("handles empty feedback lists gracefully", () => {
    const stats = calculateFeedbackDistribution([]);
    expect(stats.averageRating).toBe(0);
    expect(stats.totalResponses).toBe(0);
    expect(stats.ratingCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(stats.ratingPercentages).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("calculates accurate averages and distributions", () => {
    const reviews = [
      { rating: 5 },
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
    ];
    const stats = calculateFeedbackDistribution(reviews);
    expect(stats.totalResponses).toBe(4);
    // (5 + 5 + 5 + 4) / 4 = 4.75 -> rounded to 1 decimal: 4.8
    expect(stats.averageRating).toBe(4.8);
    expect(stats.ratingCounts[5]).toBe(3);
    expect(stats.ratingCounts[4]).toBe(1);
    expect(stats.ratingPercentages[5]).toBe(75);
    expect(stats.ratingPercentages[4]).toBe(25);
  });
});
