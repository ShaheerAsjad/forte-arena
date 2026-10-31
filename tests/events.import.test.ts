import { describe, it, expect } from "vitest";
import {
  parsePktDateToUtc,
  mapCategory,
  prepareEvent,
  prepareResult,
  shouldSkipResult,
  shouldPublishResults,
  formatResultErrorMessage,
  parseCliArgs,
  OWNER_CATEGORY_OVERRIDES,
  type RawEventInput,
  type RawResultInput,
  type EventDefaults,
} from "../scripts/import-past-events";

describe("Past Events Import - Pure Helpers", () => {
  const dummyDefaults: EventDefaults = {
    status: "COMPLETED",
    resultsPublished: false,
    participationType: "INDIVIDUAL",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxParticipants: null,
    endsAt: null,
    registrationDeadline: "same instant as startsAt",
    rules: "Not specified for this past event.",
    eligibility: "Not specified for this past event.",
    prizes: "Not specified for this past event.",
  };

  describe("parsePktDateToUtc", () => {
    it("converts a 2025-07-23 10:00 PKT date to 2025-07-23T05:00:00.000Z", () => {
      const utcDate = parsePktDateToUtc("2025-07-23T10:00:00+05:00");
      expect(utcDate?.toISOString()).toBe("2025-07-23T05:00:00.000Z");

      const dateOnly = parsePktDateToUtc("2025-07-23");
      expect(dateOnly?.toISOString()).toBe("2025-07-23T05:00:00.000Z");

      const dmy = parsePktDateToUtc("23-07-2025");
      expect(dmy?.toISOString()).toBe("2025-07-23T05:00:00.000Z");
    });

    it("returns null for null, empty, blank placeholder, or invalid dates", () => {
      expect(parsePktDateToUtc(null)).toBeNull();
      expect(parsePktDateToUtc(undefined)).toBeNull();
      expect(parsePktDateToUtc("")).toBeNull();
      expect(parsePktDateToUtc("   ")).toBeNull();
      expect(parsePktDateToUtc("____")).toBeNull();
      expect(parsePktDateToUtc("not-a-date")).toBeNull();
    });
  });

  describe("mapCategory", () => {
    it("maps category hints to nearest EventCategory enum values when no override exists", () => {
      expect(mapCategory("technical")).toBe("TECHNICAL");
      expect(mapCategory("AI and IT")).toBe("TECHNICAL");
      expect(mapCategory("social / festival")).toBe("CULTURAL");
      expect(mapCategory("cultural / religious")).toBe("CULTURAL");
      expect(mapCategory("social")).toBe("CULTURAL");
      expect(mapCategory("recreational / trip")).toBe("SPORTS");
      expect(mapCategory("gaming tournament")).toBe("GAMING");
      expect(mapCategory("academic lecture")).toBe("ACADEMIC");
      expect(mapCategory("other unknown")).toBe("OTHER");
    });

    it("honors owner-specified category overrides by slug", () => {
      expect(OWNER_CATEGORY_OVERRIDES["mango-carnival-2025"]).toBe("OTHER");
      expect(mapCategory("social / festival", "mango-carnival-2025")).toBe("OTHER");

      expect(OWNER_CATEGORY_OVERRIDES["welcome-party-2025"]).toBe("OTHER");
      expect(mapCategory("social", "welcome-party-2025")).toBe("OTHER");

      expect(OWNER_CATEGORY_OVERRIDES["forte-alpine-adventure-snow-edition"]).toBe("OTHER");
      expect(mapCategory("recreational / trip", "forte-alpine-adventure-snow-edition")).toBe("OTHER");

      expect(mapCategory("social / festival", "qurban-carnival-2025")).toBe("CULTURAL");
      expect(mapCategory("cultural / religious", "mehfil-e-naat-2025")).toBe("CULTURAL");
      expect(mapCategory("cultural / religious", "mehfil-e-naat-2025-tilawat")).toBe("CULTURAL");
      expect(mapCategory("cultural", "culture-festival")).toBe("CULTURAL");
      expect(mapCategory("technical", "ai-and-it-expo-2025")).toBe("TECHNICAL");
    });
  });

  describe("prepareEvent", () => {
    const rawEventWithDate: RawEventInput = {
      slug: "mango-carnival-2025",
      title: "Mango Carnival 2025",
      categoryHint: "social / festival",
      startsAt: "2025-07-23T10:00:00+05:00",
      venue: "Forté Colleges of Excellence, Sargodha Campus, 91-A Satellite Town, Sargodha",
      summary: "Mango Carnival summary",
      description: "Mango Carnival description",
      posterFile: "posters/mango-carnival-2025.jpg",
    };

    const rawEventWithoutDate: RawEventInput = {
      slug: "qurban-carnival-2025",
      title: "Qurban Carnival 2025",
      categoryHint: "social / festival",
      startsAt: null,
      venue: "Forté Colleges of Excellence, Sargodha Campus, 91-A Satellite Town, Sargodha",
      summary: "Qurban Carnival summary",
      description: "Qurban Carnival description",
      posterFile: "posters/qurban-carnival-2025.jpg",
    };

    it("applies defaults, parses startsAt, sets registrationDeadline equal to startsAt, and uses owner category", () => {
      const prepared = prepareEvent(rawEventWithDate, dummyDefaults, "organizer-123");
      expect(prepared).not.toBeNull();
      expect(prepared?.slug).toBe("mango-carnival-2025");
      expect(prepared?.category).toBe("OTHER"); // Owner override
      expect(prepared?.status).toBe("COMPLETED");
      expect(prepared?.participationType).toBe("INDIVIDUAL");
      expect(prepared?.minTeamSize).toBe(1);
      expect(prepared?.maxTeamSize).toBe(1);
      expect(prepared?.maxParticipants).toBeNull();
      expect(prepared?.endsAt).toBeNull();
      expect(prepared?.createdById).toBe("organizer-123");
      expect(prepared?.rules).toBe(dummyDefaults.rules);
      expect(prepared?.eligibility).toBe(dummyDefaults.eligibility);
      expect(prepared?.prizes).toBe(dummyDefaults.prizes);
      expect(prepared?.startsAt.toISOString()).toBe("2025-07-23T05:00:00.000Z");
      expect(prepared?.registrationDeadline.toISOString()).toBe("2025-07-23T05:00:00.000Z");
      expect(prepared?.registrationDeadline).toEqual(prepared?.startsAt);
    });

    it("skips events with a null or missing date by returning null", () => {
      const prepared = prepareEvent(rawEventWithoutDate, dummyDefaults, "organizer-123");
      expect(prepared).toBeNull();
    });

    it("supports date override when the user provides missing dates", () => {
      const prepared = prepareEvent(rawEventWithoutDate, dummyDefaults, "organizer-123", {
        customDate: "2025-06-15",
      });
      expect(prepared).not.toBeNull();
      expect(prepared?.startsAt.toISOString()).toBe("2025-06-15T05:00:00.000Z");
    });
  });

  describe("prepareResult & result helpers", () => {
    const rawResult: RawResultInput = {
      eventSlug: "mehfil-e-naat-2025",
      position: 1,
      award: "1st Position - Naat",
      customParticipantName: "Tehreem",
      segment: "Naat",
      isTie: false,
    };

    it("maps raw result to Result database shape with null registrationId", () => {
      const prepared = prepareResult(rawResult, "evt-123");
      expect(prepared).toEqual({
        eventId: "evt-123",
        eventSlug: "mehfil-e-naat-2025",
        position: 1,
        award: "1st Position - Naat",
        customParticipantName: "Tehreem",
        isTie: false,
        registrationId: null,
      });
    });

    it("detects existing results idempotently based on eventId, position, and participant name", () => {
      const existing = [
        {
          eventId: "evt-123",
          customParticipantName: "Tehreem",
          position: 1,
        },
      ];

      expect(
        shouldSkipResult(existing, {
          eventId: "evt-123",
          customParticipantName: "Tehreem",
          position: 1,
        })
      ).toBe(true);

      // Case-insensitive match
      expect(
        shouldSkipResult(existing, {
          eventId: "evt-123",
          customParticipantName: "  tehreem  ",
          position: 1,
        })
      ).toBe(true);

      // Different participant
      expect(
        shouldSkipResult(existing, {
          eventId: "evt-123",
          customParticipantName: "Urwa",
          position: 1,
        })
      ).toBe(false);

      // Different position
      expect(
        shouldSkipResult(existing, {
          eventId: "evt-123",
          customParticipantName: "Tehreem",
          position: 2,
        })
      ).toBe(false);

      // Different event
      expect(
        shouldSkipResult(existing, {
          eventId: "evt-456",
          customParticipantName: "Tehreem",
          position: 1,
        })
      ).toBe(false);
    });

    it("decides shouldPublishResults correctly", () => {
      expect(
        shouldPublishResults(
          { publishResultsAfterImport: true },
          2, // created
          0  // existing
        )
      ).toBe(true);

      expect(
        shouldPublishResults(
          { publishResultsAfterImport: true },
          0,
          2  // existing
        )
      ).toBe(true);

      // No results
      expect(
        shouldPublishResults(
          { publishResultsAfterImport: true },
          0,
          0
        )
      ).toBe(false);

      // Event does not request publishing
      expect(
        shouldPublishResults(
          { publishResultsAfterImport: false },
          2,
          0
        )
      ).toBe(false);

      expect(
        shouldPublishResults(
          {},
          2,
          0
        )
      ).toBe(false);
    });
  });

  describe("formatResultErrorMessage", () => {
    it("handles Prisma P2002 unique constraint violations clearly", () => {
      const p2002Err = {
        code: "P2002",
        message: "Unique constraint failed on the constraint: results_event_podium_unique_idx",
      };
      const msg = formatResultErrorMessage(p2002Err, {
        eventSlug: "mehfil-e-naat-2025",
        position: 1,
        customParticipantName: "Urwa",
      });
      expect(msg).toContain("P2002");
      expect(msg).toContain("Urwa");
      expect(msg).toContain("mehfil-e-naat-2025");
      expect(msg).toContain("Unique constraint violation");
    });

    it("handles generic Error instances", () => {
      const genericErr = new Error("Connection timeout");
      const msg = formatResultErrorMessage(genericErr, {
        eventSlug: "mehfil-e-naat-2025",
        position: 1,
        customParticipantName: "Urwa",
      });
      expect(msg).toContain("Connection timeout");
      expect(msg).toContain("Urwa");
    });
  });

  describe("parseCliArgs", () => {
    it("parses --data-dir and --execute correctly", () => {
      const { dataDir, isExecute } = parseCliArgs([
        "--data-dir=C:/temp/import",
        "--execute",
      ]);
      expect(dataDir).toBe("C:/temp/import");
      expect(isExecute).toBe(true);
    });

    it("defaults isExecute to false when not provided", () => {
      const { dataDir, isExecute } = parseCliArgs(["--data-dir=C:/temp/import"]);
      expect(dataDir).toBe("C:/temp/import");
      expect(isExecute).toBe(false);
    });
  });
});
