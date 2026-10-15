import { describe, it, expect } from "vitest";
import {
  validateRankUniqueness,
  validateEventPublishability,
  type ExistingResultItem,
} from "@/features/results/results.rules";

describe("Results Rules: Rank Uniqueness & Ties", () => {
  const existingResults: ExistingResultItem[] = [
    {
      id: "res-1",
      position: 1,
      isTie: false,
      participantName: "Alpha Team",
      registrationId: "reg-1",
    },
    {
      id: "res-2",
      position: 2,
      isTie: false,
      participantName: "Beta Player",
      registrationId: "reg-2",
    },
    {
      id: "res-3",
      position: 3,
      isTie: false,
      participantName: "Gamma Coders",
      registrationId: "reg-3",
    },
    {
      id: "res-4",
      position: 4,
      isTie: false,
      participantName: "Delta Squad",
      registrationId: "reg-4",
    },
  ];

  it("rejects duplicate 1st place when tie is not ticked", () => {
    const result = validateRankUniqueness(1, false, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("1st Place (Champion) is already awarded to \"Alpha Team\"");
    expect(result.error).toContain("Tick \"Tie\" if this position is shared");
  });

  it("rejects duplicate 2nd place when tie is not ticked", () => {
    const result = validateRankUniqueness(2, false, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("2nd Place (Runner-up) is already awarded to \"Beta Player\"");
  });

  it("rejects duplicate 3rd place when tie is not ticked", () => {
    const result = validateRankUniqueness(3, false, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("3rd Place is already awarded to \"Gamma Coders\"");
  });

  it("allows shared podium positions when existing and new results both mark tie", () => {
    const resultsWithTie: ExistingResultItem[] = [
      {
        id: "res-1",
        position: 1,
        isTie: true,
        participantName: "Alpha Team",
        registrationId: "reg-1",
      },
    ];

    const result = validateRankUniqueness(1, true, resultsWithTie);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects shared rank if new result ticks tie but existing result does not have tie", () => {
    const result = validateRankUniqueness(1, true, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("allows positions greater than 3 without requiring tie", () => {
    const result = validateRankUniqueness(4, false, existingResults);
    expect(result.valid).toBe(true);
  });

  it("allows updating the same record without triggering self-conflict", () => {
    const result = validateRankUniqueness(1, false, existingResults, "res-1");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid positions less than 1", () => {
    const result = validateRankUniqueness(0, false, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Position must be 1 or higher");
  });
});

describe("Results Rules: Event Publishability", () => {
  it("rejects publishing when event status is not COMPLETED", () => {
    const resDraft = validateEventPublishability("DRAFT", 5);
    expect(resDraft.canPublish).toBe(false);
    expect(resDraft.error).toContain("Results can only be published once the event is COMPLETED");

    const resPublished = validateEventPublishability("PUBLISHED", 5);
    expect(resPublished.canPublish).toBe(false);
    expect(resPublished.error).toContain("currently \"PUBLISHED\"");

    const resClosed = validateEventPublishability("CLOSED", 5);
    expect(resClosed.canPublish).toBe(false);
  });

  it("rejects publishing when event is COMPLETED but has 0 results", () => {
    const result = validateEventPublishability("COMPLETED", 0);
    expect(result.canPublish).toBe(false);
    expect(result.error).toContain("Cannot publish results because no results have been added");
  });

  it("allows publishing when event is COMPLETED and has at least 1 result", () => {
    const result = validateEventPublishability("COMPLETED", 3);
    expect(result.canPublish).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
