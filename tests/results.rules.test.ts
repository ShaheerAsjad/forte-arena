import { describe, it, expect } from "vitest";
import {
  validateRankUniqueness,
  validateParticipantUniqueness,
  getAutomaticAwardForPosition,
  validateAwardForPosition,
  validateQuickPodiumPayload,
  validateBatchAwardPayload,
  validateEventPublishability,
  type ExistingResultItem,
  type QuickPodiumPayload,
} from "@/features/results/results.rules";

describe("Results Rules: Rank Uniqueness (Positions 1-3 Strictly Unique)", () => {
  const existingResults: ExistingResultItem[] = [
    {
      id: "res-1",
      position: 1,
      participantName: "Alpha Team",
      registrationId: "reg-1",
    },
    {
      id: "res-2",
      position: 2,
      participantName: "Beta Player",
      registrationId: "reg-2",
    },
    {
      id: "res-3",
      position: 3,
      participantName: "Gamma Coders",
      registrationId: "reg-3",
    },
    {
      id: "res-4",
      position: 4,
      participantName: "Delta Squad",
      registrationId: "reg-4",
    },
  ];

  it("rejects duplicate 1st place with no exceptions", () => {
    const result = validateRankUniqueness(1, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1st Place is already given to "Alpha Team"');
  });

  it("rejects duplicate 2nd place with no exceptions", () => {
    const result = validateRankUniqueness(2, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2nd Place is already given to "Beta Player"');
  });

  it("rejects duplicate 3rd place with no exceptions", () => {
    const result = validateRankUniqueness(3, existingResults);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3rd Place is already given to "Gamma Coders"');
  });

  it("allows updating the same record without triggering self-conflict", () => {
    const result = validateRankUniqueness(1, existingResults, "res-1");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("allows positions 4 and higher to repeat or be reused", () => {
    const result = validateRankUniqueness(4, existingResults);
    expect(result.valid).toBe(true);

    const result5 = validateRankUniqueness(5, existingResults);
    expect(result5.valid).toBe(true);
  });

  it("rejects invalid positions less than 1", () => {
    const result0 = validateRankUniqueness(0, existingResults);
    expect(result0.valid).toBe(false);
    expect(result0.error).toContain("Position must be 1 or higher");

    const resultNeg = validateRankUniqueness(-2, existingResults);
    expect(resultNeg.valid).toBe(false);
  });
});

describe("Results Rules: Participant Uniqueness (One Result Per Participant)", () => {
  const existingResults: ExistingResultItem[] = [
    {
      id: "res-1",
      position: 1,
      participantName: "Alpha Team",
      registrationId: "reg-1",
    },
    {
      id: "res-walkin-1",
      position: 2,
      participantName: "John Doe",
      customParticipantName: "John Doe",
    },
  ];

  it("rejects registered participant who already has a result", () => {
    const result = validateParticipantUniqueness(
      "REGISTERED",
      "reg-1",
      null,
      existingResults
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already has a result recorded');
  });

  it("allows registering participant who does not have a result", () => {
    const result = validateParticipantUniqueness(
      "REGISTERED",
      "reg-99",
      null,
      existingResults
    );
    expect(result.valid).toBe(true);
  });

  it("rejects walk-in participant with duplicate name (case-insensitive and trimmed)", () => {
    const result1 = validateParticipantUniqueness(
      "WALKIN",
      null,
      "  john doe  ",
      existingResults
    );
    expect(result1.valid).toBe(false);
    expect(result1.error).toContain('A participant named "john doe" already has a result');

    const result2 = validateParticipantUniqueness(
      "WALKIN",
      null,
      "JOHN DOE",
      existingResults
    );
    expect(result2.valid).toBe(false);
  });

  it("rejects walk-in name matching an approved team name", () => {
    const result = validateParticipantUniqueness(
      "WALKIN",
      null,
      "Alpha Team",
      existingResults
    );
    expect(result.valid).toBe(false);
  });

  it("allows updating the same participant when editing", () => {
    const result = validateParticipantUniqueness(
      "REGISTERED",
      "reg-1",
      null,
      existingResults,
      "res-1"
    );
    expect(result.valid).toBe(true);

    const resultWalkin = validateParticipantUniqueness(
      "WALKIN",
      null,
      "John Doe",
      existingResults,
      "res-walkin-1"
    );
    expect(resultWalkin.valid).toBe(true);
  });
});

describe("Results Rules: Award Labels & Presets", () => {
  it("provides automatic awards for positions 1, 2, and 3", () => {
    expect(getAutomaticAwardForPosition(1)).toBe("Champion");
    expect(getAutomaticAwardForPosition(2)).toBe("Runner-up");
    expect(getAutomaticAwardForPosition(3)).toBe("Second Runner-up");
    expect(getAutomaticAwardForPosition(4)).toBeNull();
    expect(getAutomaticAwardForPosition(5)).toBeNull();
  });

  it("enforces strict award titles for podium ranks", () => {
    expect(validateAwardForPosition(1, "Champion").valid).toBe(true);
    expect(validateAwardForPosition(1, "champion").valid).toBe(true);
    expect(validateAwardForPosition(1, "Winner").valid).toBe(false);
    expect(validateAwardForPosition(1, "Winner").error).toContain('must have the award title "Champion"');

    expect(validateAwardForPosition(2, "Runner-up").valid).toBe(true);
    expect(validateAwardForPosition(2, "Second Place").valid).toBe(false);

    expect(validateAwardForPosition(3, "Second Runner-up").valid).toBe(true);
    expect(validateAwardForPosition(3, "Bronze").valid).toBe(false);
  });

  it("allows positions 4+ to have Honorable Mention, Participation or custom titles", () => {
    expect(validateAwardForPosition(4, "Honorable Mention").valid).toBe(true);
    expect(validateAwardForPosition(4, "Participation").valid).toBe(true);
    expect(validateAwardForPosition(4, "Best Speaker").valid).toBe(true);
    expect(validateAwardForPosition(5, "Fourth Place").valid).toBe(true);
  });

  it("rejects Champion and Runner-up titles for positions 4+", () => {
    expect(validateAwardForPosition(4, "Champion").valid).toBe(false);
    expect(validateAwardForPosition(4, "Champion").error).toContain("Positions 4 and higher cannot be awarded");

    expect(validateAwardForPosition(5, "Runner-up").valid).toBe(false);
    expect(validateAwardForPosition(6, "Second Runner-up").valid).toBe(false);
  });

  it("rejects empty award title", () => {
    expect(validateAwardForPosition(4, "   ").valid).toBe(false);
    expect(validateAwardForPosition(4, "   ").error).toContain("Award title is required");
  });
});

describe("Results Rules: Quick Podium Validation", () => {
  const existingResults: ExistingResultItem[] = [
    {
      id: "res-3",
      position: 3,
      participantName: "Bronze Winner",
      registrationId: "reg-bronze",
    },
  ];

  it("rejects completely empty quick podium submission", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: null,
      second: null,
      third: null,
    };
    const res = validateQuickPodiumPayload(payload, []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Please select at least one podium winner");
  });

  it("allows partial podium selection (e.g. only 1st and 2nd)", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: { participantType: "REGISTERED", registrationId: "reg-1" },
      second: { participantType: "WALKIN", customParticipantName: "Alex" },
      third: null,
    };
    const res = validateQuickPodiumPayload(payload, []);
    expect(res.valid).toBe(true);
  });

  it("rejects duplicate participant assigned to multiple slots", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: { participantType: "REGISTERED", registrationId: "reg-1" },
      second: { participantType: "REGISTERED", registrationId: "reg-1" },
      third: null,
    };
    const res = validateQuickPodiumPayload(payload, []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Cannot assign the same participant");
  });

  it("rejects duplicate walk-in name across slots", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: { participantType: "WALKIN", customParticipantName: "Same Name" },
      second: { participantType: "WALKIN", customParticipantName: " same name " },
      third: null,
    };
    const res = validateQuickPodiumPayload(payload, []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Cannot assign the same participant");
  });

  it("rejects filling a slot if that position is already occupied in existing results", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: { participantType: "REGISTERED", registrationId: "reg-1" },
      third: { participantType: "REGISTERED", registrationId: "reg-2" }, // Position 3 already held!
    };
    const res = validateQuickPodiumPayload(payload, existingResults);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('3rd Place is already given to "Bronze Winner"');
  });

  it("rejects participant if they already hold a result in the event", () => {
    const payload: QuickPodiumPayload = {
      eventId: "evt-1",
      first: { participantType: "REGISTERED", registrationId: "reg-bronze" }, // already bronze holder
    };
    const res = validateQuickPodiumPayload(payload, existingResults);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("already has a result recorded for this event");
  });
});

describe("Results Rules: Batch Award Validation", () => {
  const existingResults: ExistingResultItem[] = [
    { id: "res-1", position: 1, participantName: "Champion", registrationId: "reg-1" },
    { id: "res-2", position: 2, participantName: "Runner", registrationId: "reg-2" },
  ];

  it("rejects empty registration list", () => {
    const res = validateBatchAwardPayload([], "Participation", existingResults);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Please select at least one participant");
  });

  it("computes next starting position (at least 4)", () => {
    const res = validateBatchAwardPayload(["reg-3", "reg-4"], "Participation", existingResults);
    expect(res.valid).toBe(true);
    expect(res.startingPosition).toBe(4);
  });

  it("computes next starting position when higher ranks already exist", () => {
    const higherResults: ExistingResultItem[] = [
      ...existingResults,
      { id: "res-7", position: 7, participantName: "Seventh", registrationId: "reg-7" },
    ];
    const res = validateBatchAwardPayload(["reg-8", "reg-9"], "Participation", higherResults);
    expect(res.valid).toBe(true);
    expect(res.startingPosition).toBe(8);
  });

  it("rejects if any selected participant already holds a result", () => {
    const res = validateBatchAwardPayload(["reg-1", "reg-3"], "Participation", existingResults);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("already has a result recorded for this event");
  });

  it("rejects duplicate registration IDs in the batch", () => {
    const res = validateBatchAwardPayload(["reg-3", "reg-3"], "Participation", existingResults);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("contains duplicates");
  });
});

describe("Results Rules: Event Publishability", () => {
  it("rejects publishing when event status is not COMPLETED", () => {
    const resDraft = validateEventPublishability("DRAFT", 5);
    expect(resDraft.canPublish).toBe(false);
    expect(resDraft.error).toContain("Results can only be published once the event is COMPLETED");

    const resPublished = validateEventPublishability("PUBLISHED", 5);
    expect(resPublished.canPublish).toBe(false);
    expect(resPublished.error).toContain('currently "PUBLISHED"');

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
