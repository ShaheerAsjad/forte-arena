import { describe, it, expect } from "vitest";
import {
  filterAndSortEvents,
  getAvailableCategories,
  parseEventsFilterParams,
  serializeEventsFilterParams,
  isEventFinished,
  type EventsFilterState,
} from "@/features/events/events.filter";
import type { EventWithDerivedStatus, EventCardItem } from "@/features/events/events.derived";

function createMockEvent(
  overrides: Partial<EventCardItem> & { derivedStatus?: EventWithDerivedStatus["derivedStatus"] }
): EventWithDerivedStatus {
  const { derivedStatus = "Registration Open", ...itemOverrides } = overrides;

  const item: EventCardItem = {
    id: "evt-" + Math.random().toString(36).slice(2, 8),
    slug: "mock-slug-" + Math.random().toString(36).slice(2, 8),
    title: "Algorithmic Championship",
    summary: "High-octane coding battle for students",
    category: "TECHNICAL",
    status: "PUBLISHED",
    participationType: "INDIVIDUAL",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxParticipants: 100,
    startsAt: new Date("2026-11-15T10:00:00Z"),
    endsAt: new Date("2026-11-15T18:00:00Z"),
    registrationDeadline: new Date("2026-11-10T23:59:59Z"),
    posterUrl: null,
    venue: "Computing Lab 4",
    _count: { registrations: 45 },
    ...itemOverrides,
  };

  return {
    item,
    derivedStatus,
    remainingSeats: 55,
  };
}

describe("Events Filter and Search Logic", () => {
  const event1 = createMockEvent({
    title: "CodeSprint Algorithmic Battle",
    summary: "Speed programming and problem solving",
    venue: "Computer Science Lab 3",
    category: "TECHNICAL",
    status: "PUBLISHED",
    participationType: "INDIVIDUAL",
    startsAt: new Date("2026-11-10T10:00:00Z"),
    endsAt: new Date("2026-11-10T18:00:00Z"),
    derivedStatus: "Registration Open",
  });

  const event2 = createMockEvent({
    title: "Futsal Frenzy Cup",
    summary: "Indoor futsal knockout tournament",
    venue: "Sports Complex Arena A",
    category: "SPORTS",
    status: "PUBLISHED",
    participationType: "TEAM",
    startsAt: new Date("2026-11-15T14:00:00Z"),
    endsAt: new Date("2026-11-15T20:00:00Z"),
    derivedStatus: "Closing Soon",
  });

  const event3 = createMockEvent({
    title: "Valorant Campus Clash",
    summary: "5v5 tactical shooter esports championship",
    venue: "Main Auditorium Stage",
    category: "GAMING",
    status: "CLOSED",
    participationType: "TEAM",
    startsAt: new Date("2026-11-05T09:00:00Z"),
    endsAt: new Date("2026-11-05T17:00:00Z"),
    derivedStatus: "Closed",
  });

  const event4 = createMockEvent({
    title: "Robotics Hackathon & Showcase",
    summary: "Autonomous drone navigation challenge",
    venue: "Engineering Hall",
    category: "TECHNICAL",
    status: "COMPLETED",
    participationType: "TEAM",
    startsAt: new Date("2026-10-01T08:00:00Z"),
    endsAt: new Date("2026-10-01T18:00:00Z"),
    derivedStatus: "Completed",
  });

  const draftEvent = createMockEvent({
    title: "Secret Unannounced Battle of the Bands",
    summary: "Music competition in progress",
    venue: "Amphitheater",
    category: "CULTURAL",
    status: "DRAFT",
    participationType: "TEAM",
    startsAt: new Date("2026-12-01T12:00:00Z"),
    derivedStatus: "Upcoming",
  });

  const cancelledEvent = createMockEvent({
    title: "Cancelled Math Olympiad",
    summary: "Cancelled tournament",
    venue: "Room 101",
    category: "ACADEMIC",
    status: "CANCELLED",
    participationType: "INDIVIDUAL",
    startsAt: new Date("2026-11-20T10:00:00Z"),
    derivedStatus: "Closed",
  });

  const sampleEvents = [event1, event2, event3, event4, draftEvent, cancelledEvent];

  describe("Keyword Search", () => {
    it("matches title case-insensitively with whitespace trimming", () => {
      const results = filterAndSortEvents(sampleEvents, { q: "  codesprint  " });
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe("CodeSprint Algorithmic Battle");
    });

    it("matches summary case-insensitively", () => {
      const results = filterAndSortEvents(sampleEvents, { q: "tactical shooter" });
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe("Valorant Campus Clash");
    });

    it("matches venue case-insensitively", () => {
      const results = filterAndSortEvents(sampleEvents, { q: "Arena A" });
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe("Futsal Frenzy Cup");
    });

    it("returns empty array when keyword matches nothing", () => {
      const results = filterAndSortEvents(sampleEvents, { q: "non-existent-keyword-xyz" });
      expect(results).toHaveLength(0);
    });

    it("returns all non-draft events when search query is empty or whitespace only", () => {
      const results = filterAndSortEvents(sampleEvents, { q: "   " });
      expect(results).toHaveLength(4);
    });
  });

  describe("Category Filtering & Available Categories", () => {
    it("filters accurately by specific category", () => {
      const technical = filterAndSortEvents(sampleEvents, { category: "TECHNICAL" });
      expect(technical).toHaveLength(2);
      expect(technical.map((e) => e.item.title)).toContain("CodeSprint Algorithmic Battle");
      expect(technical.map((e) => e.item.title)).toContain("Robotics Hackathon & Showcase");
    });

    it("returns all public categories when category is 'ALL'", () => {
      const all = filterAndSortEvents(sampleEvents, { category: "ALL" });
      expect(all).toHaveLength(4);
    });

    it("extracts unique categories actually present among public non-draft events", () => {
      const categories = getAvailableCategories(sampleEvents);
      expect(categories).toContain("TECHNICAL");
      expect(categories).toContain("SPORTS");
      expect(categories).toContain("GAMING");
      // DRAFT event category CULTURAL and CANCELLED event category ACADEMIC must not appear
      expect(categories).not.toContain("CULTURAL");
      expect(categories).not.toContain("ACADEMIC");
    });
  });

  describe("Derived Status Filtering", () => {
    it("filters by 'OPEN' matching both 'Registration Open' and 'Closing Soon'", () => {
      const openEvents = filterAndSortEvents(sampleEvents, { status: "OPEN" });
      expect(openEvents).toHaveLength(2);
      expect(openEvents.map((e) => e.item.title)).toEqual(
        expect.arrayContaining(["CodeSprint Algorithmic Battle", "Futsal Frenzy Cup"])
      );
    });

    it("filters by 'CLOSED' matching derived 'Closed' status", () => {
      const closedEvents = filterAndSortEvents(sampleEvents, { status: "CLOSED" });
      expect(closedEvents).toHaveLength(1);
      expect(closedEvents[0].item.title).toBe("Valorant Campus Clash");
    });

    it("filters by 'COMPLETED' matching derived 'Completed' status", () => {
      const completedEvents = filterAndSortEvents(sampleEvents, { status: "COMPLETED" });
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].item.title).toBe("Robotics Hackathon & Showcase");
    });
  });

  describe("Participation Type Filtering", () => {
    it("filters by 'INDIVIDUAL' (Solo)", () => {
      const solo = filterAndSortEvents(sampleEvents, { type: "INDIVIDUAL" });
      expect(solo).toHaveLength(1);
      expect(solo[0].item.title).toBe("CodeSprint Algorithmic Battle");
    });

    it("accepts 'SOLO' as an alias for 'INDIVIDUAL'", () => {
      const solo = filterAndSortEvents(sampleEvents, { type: "SOLO" });
      expect(solo).toHaveLength(1);
      expect(solo[0].item.title).toBe("CodeSprint Algorithmic Battle");
    });

    it("filters by 'TEAM'", () => {
      const team = filterAndSortEvents(sampleEvents, { type: "TEAM" });
      expect(team).toHaveLength(3);
      expect(team.every((e) => e.item.participationType === "TEAM")).toBe(true);
    });

    it("returns both when type is 'ALL'", () => {
      const both = filterAndSortEvents(sampleEvents, { type: "ALL" });
      expect(both).toHaveLength(4);
    });
  });

  describe("Default Sort: Upcoming First", () => {
    const fixedNow = new Date("2026-11-08T12:00:00Z");

    it("places upcoming/active events first (ascending startsAt), followed by finished events (descending startsAt)", () => {
      // At 2026-11-08:
      // event1 (Nov 10): upcoming
      // event2 (Nov 15): upcoming
      // event3 (Nov 05): finished
      // event4 (Oct 01): finished
      const sorted = filterAndSortEvents(sampleEvents, { sort: "soonest" }, fixedNow);
      const titles = sorted.map((e) => e.item.title);

      expect(titles).toEqual([
        "CodeSprint Algorithmic Battle", // upcoming (starts Nov 10)
        "Futsal Frenzy Cup", // upcoming (starts Nov 15)
        "Valorant Campus Clash", // finished (started Nov 5, most recent)
        "Robotics Hackathon & Showcase", // finished (started Oct 1, older)
      ]);
    });

    it("correctly calculates ended status when endsAt is null using startsAt + 2 hours", () => {
      const pastNoEndsAt = createMockEvent({
        title: "Finished Workshop Without EndsAt",
        startsAt: new Date("2026-11-08T08:00:00Z"), // ended 10:00:00Z (before 12:00:00Z)
        endsAt: null,
      });

      const upcomingNoEndsAt = createMockEvent({
        title: "Active Meetup Without EndsAt",
        startsAt: new Date("2026-11-08T11:00:00Z"), // ends 13:00:00Z (after 12:00:00Z)
        endsAt: null,
      });

      expect(isEventFinished(pastNoEndsAt, fixedNow.getTime())).toBe(true);
      expect(isEventFinished(upcomingNoEndsAt, fixedNow.getTime())).toBe(false);
    });

    it("sorts by 'latest' in descending startsAt order", () => {
      const sorted = filterAndSortEvents(sampleEvents, { sort: "latest" });
      const titles = sorted.map((e) => e.item.title);
      expect(titles).toEqual([
        "Futsal Frenzy Cup",
        "CodeSprint Algorithmic Battle",
        "Valorant Campus Clash",
        "Robotics Hackathon & Showcase",
      ]);
    });

    it("sorts by 'az' in alphabetical title order", () => {
      const sorted = filterAndSortEvents(sampleEvents, { sort: "az" });
      const titles = sorted.map((e) => e.item.title);
      expect(titles).toEqual([
        "CodeSprint Algorithmic Battle",
        "Futsal Frenzy Cup",
        "Robotics Hackathon & Showcase",
        "Valorant Campus Clash",
      ]);
    });
  });

  describe("Safety & Draft Exclusion Rule", () => {
    it("never includes DRAFT or CANCELLED events even if they match search criteria", () => {
      const resultDraft = filterAndSortEvents(sampleEvents, { q: "Bands" });
      expect(resultDraft).toHaveLength(0);

      const resultCancelled = filterAndSortEvents(sampleEvents, { q: "Olympiad" });
      expect(resultCancelled).toHaveLength(0);
    });
  });

  describe("URL Query Params Parsing & Serialization", () => {
    it("parses valid params into normalized state", () => {
      const parsed = parseEventsFilterParams({
        q: "hackathon",
        category: "TECHNICAL",
        status: "open",
        type: "team",
        sort: "latest",
      });

      expect(parsed).toEqual({
        q: "hackathon",
        category: "TECHNICAL",
        status: "OPEN",
        type: "TEAM",
        sort: "latest",
      });
    });

    it("safely ignores invalid params, normalizes unknown category to ALL, and falls back to defaults", () => {
      const parsed = parseEventsFilterParams({
        q: undefined,
        category: "UNKNOWN_CATEGORY",
        status: "INVALID_STATUS",
        type: "NOT_A_TYPE",
        sort: "MAGIC_SORT",
      });

      expect(parsed.q).toBe("");
      expect(parsed.category).toBe("ALL");
      expect(parsed.status).toBe("ALL");
      expect(parsed.type).toBe("ALL");
      expect(parsed.sort).toBe("soonest");
    });

    it("serializes state omitting default values", () => {
      const state: EventsFilterState = {
        q: "futsal",
        category: "SPORTS",
        status: "OPEN",
        type: "TEAM",
        sort: "az",
      };

      const queryStr = serializeEventsFilterParams(state);
      expect(queryStr).toContain("q=futsal");
      expect(queryStr).toContain("category=SPORTS");
      expect(queryStr).toContain("status=open");
      expect(queryStr).toContain("type=team");
      expect(queryStr).toContain("sort=az");
    });

    it("serializes empty query string when all filters are at defaults", () => {
      const state: EventsFilterState = {
        q: "",
        category: "ALL",
        status: "ALL",
        type: "ALL",
        sort: "soonest",
      };

      const queryStr = serializeEventsFilterParams(state);
      expect(queryStr).toBe("");
    });
  });

  describe("Status Badge Shared Mapping and Derived Status Guarantees", () => {
    it("every possible derived status has a non-empty label and visible styling", async () => {
      const { getStatusMeta } = await import("@/features/events/events.derived");
      const derivedStatuses = [
        "Upcoming",
        "Registration Open",
        "Closing Soon",
        "Closed",
        "Completed",
      ] as const;

      for (const status of derivedStatuses) {
        const meta = getStatusMeta(status);
        expect(meta.label).toBeDefined();
        expect(meta.label.trim().length).toBeGreaterThan(0);
        expect(meta.variant).toBeDefined();
        // Guaranteed not transparent outline
        if (status === "Closed") {
          expect(meta.variant).toBe("default");
          expect(meta.className).toContain("bg-navy-100");
          expect(meta.className).toContain("text-navy-900");
        }
      }
    });

    it("every possible effective / stored EventStatus has a non-empty label and visible styling", async () => {
      const { getStatusMeta } = await import("@/features/events/events.derived");
      const effectiveStatuses = [
        "DRAFT",
        "PUBLISHED",
        "CLOSED",
        "COMPLETED",
        "CANCELLED",
      ] as const;

      for (const status of effectiveStatuses) {
        const meta = getStatusMeta(status);
        expect(meta.label).toBeDefined();
        expect(meta.label.trim().length).toBeGreaterThan(0);
        expect(meta.variant).toBeDefined();
      }
    });

    it("unknown or empty status safely falls back to a non-empty label without throwing", async () => {
      const { getStatusMeta } = await import("@/features/events/events.derived");
      expect(getStatusMeta(null).label).toBe("Unknown");
      expect(getStatusMeta("").label).toBe("Unknown");
      expect(getStatusMeta("CustomSpecial").label).toBe("CustomSpecial");
    });
  });
});
