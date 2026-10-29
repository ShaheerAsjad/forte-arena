import { describe, it, expect } from "vitest";
import {
  buildIcs,
  buildGoogleCalendarUrl,
  getEventCalendarEnd,
  isCalendarEligible,
  DEFAULT_EVENT_DURATION_MINUTES,
} from "@/features/events/events.calendar";

describe("Event Calendar Helpers (RFC 5545 ICS & Google Calendar)", () => {
  // Asia/Karachi is UTC+5 (fixed, no daylight saving time)
  // E.g. 10:00 PKT = 05:00Z, 13:00 PKT = 08:00Z
  const knownPktDate = "2026-11-15T10:00:00+05:00"; // 05:00 UTC
  const knownPktEnd = "2026-11-15T13:00:00+05:00";  // 08:00 UTC
  const fixedDtstamp = new Date("2026-10-22T12:00:00Z");

  const baseEvent = {
    id: "evt-cal-123",
    slug: "robo-wars-2026",
    title: "Robo Wars Championship",
    summary: "Annual university autonomous combat robotics tournament.",
    description: "Detailed rules and fight brackets for the university championship.",
    venue: "Main Auditorium, Campus North",
    status: "PUBLISHED" as const,
    startsAt: knownPktDate,
    endsAt: knownPktEnd,
    registrationDeadline: "2026-11-10T18:00:00+05:00",
  };

  describe("buildIcs", () => {
    it("produces valid RFC 5545 output with CRLF, required headers, and correct UTC times for PKT dates", () => {
      const ics = buildIcs(baseEvent, {
        dtstamp: fixedDtstamp,
        eventUrl: "https://forte-arena.edu/events/robo-wars-2026",
      });

      // Must strictly use CRLF endings
      expect(ics).toContain("\r\n");
      const linesWithoutCr = ics.split("\n").filter((l) => !l.endsWith("\r") && l.length > 0);
      expect(linesWithoutCr.length).toBe(0);

      // Required VCALENDAR properties
      expect(ics).toContain("BEGIN:VCALENDAR\r\n");
      expect(ics).toContain("VERSION:2.0\r\n");
      expect(ics).toContain("PRODID:-//Forte Arena//Events//EN\r\n");
      expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
      expect(ics).toContain("METHOD:PUBLISH\r\n");

      // Required VEVENT properties
      expect(ics).toContain("BEGIN:VEVENT\r\n");
      expect(ics).toContain("UID:evt-cal-123@forte-arena\r\n");
      expect(ics).toContain("DTSTAMP:20261022T120000Z\r\n");

      // Verify UTC time conversion: 10:00 PKT (UTC+5) = 05:00Z, 13:00 PKT = 08:00Z
      expect(ics).toContain("DTSTART:20261115T050000Z\r\n");
      expect(ics).toContain("DTEND:20261115T080000Z\r\n");

      // Content fields & URL
      expect(ics).toContain("SUMMARY:Robo Wars Championship\r\n");
      expect(ics).toContain("LOCATION:Main Auditorium\\, Campus North\r\n");
      expect(ics).toContain("URL:https://forte-arena.edu/events/robo-wars-2026\r\n");

      // Required VALARM (60 minutes before)
      expect(ics).toContain("BEGIN:VALARM\r\n");
      expect(ics).toContain("ACTION:DISPLAY\r\n");
      expect(ics).toContain("TRIGGER:-PT60M\r\n");
      expect(ics).toContain("END:VALARM\r\n");

      expect(ics).toContain("END:VEVENT\r\n");
      expect(ics).toContain("END:VCALENDAR\r\n");
    });

    it("UID is stable across multiple calls for the same event", () => {
      const ics1 = buildIcs(baseEvent);
      const ics2 = buildIcs(baseEvent);

      const match1 = ics1.match(/UID:(.+)\r\n/);
      const match2 = ics2.match(/UID:(.+)\r\n/);

      expect(match1).not.toBeNull();
      expect(match2).not.toBeNull();
      expect(match1![1]).toBe("evt-cal-123@forte-arena");
      expect(match1![1]).toBe(match2![1]);
    });
  });

  describe("getEventCalendarEnd duration fallback", () => {
    it("uses endsAt if present and strictly after startsAt", () => {
      const end = getEventCalendarEnd({
        startsAt: knownPktDate,
        endsAt: knownPktEnd,
      });
      expect(end.toISOString()).toBe(new Date(knownPktEnd).toISOString());
    });

    it("falls back to startsAt + 120 minutes when endsAt is missing (null or undefined)", () => {
      expect(DEFAULT_EVENT_DURATION_MINUTES).toBe(120);

      const endNull = getEventCalendarEnd({
        startsAt: knownPktDate,
        endsAt: null,
      });
      // 10:00 PKT (05:00Z) + 120 minutes = 12:00 PKT (07:00Z)
      expect(endNull.toISOString()).toBe("2026-11-15T07:00:00.000Z");

      const ics = buildIcs({
        ...baseEvent,
        endsAt: null,
      });
      expect(ics).toContain("DTEND:20261115T070000Z\r\n");
    });

    it("falls back to startsAt + 120 minutes when endsAt is before or equal to startsAt", () => {
      const endBefore = getEventCalendarEnd({
        startsAt: "2026-11-15T10:00:00+05:00",
        endsAt: "2026-11-15T09:00:00+05:00", // invalid prior end
      });
      expect(endBefore.toISOString()).toBe("2026-11-15T07:00:00.000Z");

      const endEqual = getEventCalendarEnd({
        startsAt: "2026-11-15T10:00:00+05:00",
        endsAt: "2026-11-15T10:00:00+05:00",
      });
      expect(endEqual.toISOString()).toBe("2026-11-15T07:00:00.000Z");
    });
  });

  describe("Special character escaping and line folding (<= 75 octets)", () => {
    it("escapes backslashes, semicolons, commas, and newlines per RFC 5545", () => {
      const eventWithSpecialChars = {
        ...baseEvent,
        title: "Coding: C++; Python, & Go \\ Rust\nChampionship",
        venue: "Hall A, Room 101; 2nd Floor \\ North Wing",
      };

      const ics = buildIcs(eventWithSpecialChars);
      expect(ics).toContain("SUMMARY:Coding: C++\\; Python\\, & Go \\\\ Rust\\nChampionship\r\n");
      expect(ics).toContain("LOCATION:Hall A\\, Room 101\\; 2nd Floor \\\\ North Wing\r\n");
    });

    it("folds long lines at <= 75 octets without splitting multibyte UTF-8 characters, and unfolding restores original text", () => {
      // Long description containing multi-byte characters, Urdu text, and emojis
      const longText =
        "This is an extraordinarily long description designed to test RFC 5545 line folding limits. " +
        "It includes Urdu text: پاکستان یونیورسٹی مقابلہ 🏆🚀 as well as symbols and punctuation (comma, semicolon; and backslash \\). " +
        "Every single folded line must strictly respect the 75 octet boundary in UTF-8 bytes.";

      const eventWithLongText = {
        ...baseEvent,
        summary: longText,
      };

      const ics = buildIcs(eventWithLongText);

      // Check each line's byte length
      const rawLines = ics.split("\r\n");
      // Remove trailing empty line after final \r\n
      if (rawLines[rawLines.length - 1] === "") {
        rawLines.pop();
      }

      const encoder = new TextEncoder();
      for (const line of rawLines) {
        const byteLen = encoder.encode(line).length;
        expect(byteLen).toBeLessThanOrEqual(75);
      }

      // Check unfolding: RFC 5545 unfolding is replace(/\r\n /g, "")
      const unfolded = ics.replace(/\r\n /g, "");

      // The unfolded text must contain the full original text with proper escaping
      expect(unfolded).toContain("پاکستان یونیورسٹی مقابلہ 🏆🚀");
      expect(unfolded).toContain("comma\\, semicolon\\; and backslash \\\\");
    });
  });

  describe("buildGoogleCalendarUrl", () => {
    it("constructs a valid Google Calendar template URL with UTC dates and encoded fields", () => {
      const url = buildGoogleCalendarUrl(baseEvent, {
        eventUrl: "https://forte-arena.edu/events/robo-wars-2026",
      });

      expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
      expect(url).toContain("action=TEMPLATE");

      // Verify dates format YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ (UTC: 05:00Z to 08:00Z)
      expect(url).toContain("dates=20261115T050000Z/20261115T080000Z");

      // Title & location encoded
      expect(url).toContain(`text=${encodeURIComponent("Robo Wars Championship")}`);
      expect(url).toContain(`location=${encodeURIComponent("Main Auditorium, Campus North")}`);

      // Details contains description and event URL
      expect(url).toContain("details=");
      expect(decodeURIComponent(url)).toContain("Robo Wars Championship");
      expect(decodeURIComponent(url)).toContain("https://forte-arena.edu/events/robo-wars-2026");
    });
  });

  describe("isCalendarEligible", () => {
    const futureStarts = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const futureEnds = new Date(Date.now() + 52 * 3600 * 1000).toISOString();
    const pastStarts = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const pastEnds = new Date(Date.now() - 44 * 3600 * 1000).toISOString();

    it("returns true for future published event", () => {
      expect(
        isCalendarEligible({
          status: "PUBLISHED",
          startsAt: futureStarts,
          endsAt: futureEnds,
          registrationDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        })
      ).toBe(true);
    });

    it("returns true for future event whose registration is CLOSED but event itself has not ended yet", () => {
      expect(
        isCalendarEligible({
          status: "CLOSED",
          startsAt: futureStarts,
          endsAt: futureEnds,
          registrationDeadline: new Date(Date.now() - 1000).toISOString(),
        })
      ).toBe(true);
    });

    it("returns false for CANCELLED event", () => {
      expect(
        isCalendarEligible({
          status: "CANCELLED",
          startsAt: futureStarts,
          endsAt: futureEnds,
        })
      ).toBe(false);
    });

    it("returns false for DRAFT event", () => {
      expect(
        isCalendarEligible({
          status: "DRAFT",
          startsAt: futureStarts,
          endsAt: futureEnds,
        })
      ).toBe(false);
    });

    it("returns false for COMPLETED event or published results", () => {
      expect(
        isCalendarEligible({
          status: "COMPLETED",
          startsAt: futureStarts,
          endsAt: futureEnds,
        })
      ).toBe(false);

      expect(
        isCalendarEligible({
          status: "PUBLISHED",
          startsAt: futureStarts,
          endsAt: futureEnds,
          resultsPublished: true,
        })
      ).toBe(false);
    });

    it("returns false when the event has already ended (past endsAt)", () => {
      expect(
        isCalendarEligible({
          status: "PUBLISHED",
          startsAt: pastStarts,
          endsAt: pastEnds,
        })
      ).toBe(false);
    });

    it("returns false when the event has ended by duration fallback (past startsAt + 120 min)", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(
        isCalendarEligible({
          status: "PUBLISHED",
          startsAt: threeHoursAgo,
          endsAt: null,
        })
      ).toBe(false);
    });
  });
});
