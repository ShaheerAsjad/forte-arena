import { describe, it, expect } from "vitest";
import {
  isChildEventSlug,
  findChildEvents,
  getCandidateParentSlugs,
  findParentEvent,
  getChildSubHeading,
} from "@/features/events/events.relation";

describe("Event Slug Relation Pure Functions", () => {
  describe("isChildEventSlug", () => {
    it("returns true when candidate slug starts with parentSlug + '-'", () => {
      expect(
        isChildEventSlug("mehfil-e-naat-2025", "mehfil-e-naat-2025-tilawat")
      ).toBe(true);
      expect(
        isChildEventSlug("ai-and-it-expo-2025", "ai-and-it-expo-2025-hackathon")
      ).toBe(true);
    });

    it("returns false when candidate has same prefix but without hyphen boundary (e.g. 2025 vs 2025x)", () => {
      expect(
        isChildEventSlug("ai-and-it-expo-2025", "ai-and-it-expo-2025x")
      ).toBe(false);
      expect(
        isChildEventSlug("spring-fest", "spring-festival")
      ).toBe(false);
    });

    it("returns false when slugs are identical", () => {
      expect(
        isChildEventSlug("mehfil-e-naat-2025", "mehfil-e-naat-2025")
      ).toBe(false);
    });

    it("returns false when candidate is shorter than parent or unrelated", () => {
      expect(
        isChildEventSlug("mehfil-e-naat-2025-tilawat", "mehfil-e-naat-2025")
      ).toBe(false);
      expect(
        isChildEventSlug("sports-gala-2025", "cultural-fest-2025")
      ).toBe(false);
    });

    it("handles null, undefined, empty strings, and case differences", () => {
      expect(isChildEventSlug("", "slug-child")).toBe(false);
      expect(isChildEventSlug("parent", "")).toBe(false);
      expect(isChildEventSlug(undefined, "child")).toBe(false);
      expect(isChildEventSlug("PARENT", "parent-child")).toBe(true);
    });
  });

  describe("findChildEvents", () => {
    it("filters candidate events accurately", () => {
      const candidates = [
        { slug: "mehfil-e-naat-2025-tilawat", title: "Tilawat" },
        { slug: "mehfil-e-naat-2025-qirat", title: "Qirat" },
        { slug: "mehfil-e-naat-2025", title: "Main Event" },
        { slug: "mehfil-e-naat-2025x", title: "Unrelated" },
        { slug: "cultural-night-2025", title: "Cultural" },
      ];

      const children = findChildEvents("mehfil-e-naat-2025", candidates);
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.slug)).toEqual([
        "mehfil-e-naat-2025-tilawat",
        "mehfil-e-naat-2025-qirat",
      ]);
    });

    it("returns empty array for empty candidates or invalid parent", () => {
      expect(findChildEvents("", [])).toEqual([]);
      expect(findChildEvents("parent", [])).toEqual([]);
    });
  });

  describe("getCandidateParentSlugs", () => {
    it("generates trimmed prefixes in longest-first order", () => {
      expect(
        getCandidateParentSlugs("mehfil-e-naat-2025-tilawat")
      ).toEqual([
        "mehfil-e-naat-2025",
        "mehfil-e-naat",
        "mehfil-e",
        "mehfil",
      ]);
    });

    it("returns single parent candidate for two-segment slug", () => {
      expect(getCandidateParentSlugs("fest-hackathon")).toEqual(["fest"]);
    });

    it("returns empty array for single segment slug without hyphens", () => {
      expect(getCandidateParentSlugs("hackathon")).toEqual([]);
      expect(getCandidateParentSlugs("")).toEqual([]);
      expect(getCandidateParentSlugs(null)).toEqual([]);
    });
  });

  describe("findParentEvent", () => {
    it("finds the direct parent when present in existing events", () => {
      const existing = [
        { slug: "mehfil-e-naat-2025", title: "Mehfil-e-Naat 2025" },
        { slug: "other-event", title: "Other Event" },
      ];

      const parent = findParentEvent("mehfil-e-naat-2025-tilawat", existing);
      expect(parent).not.toBeNull();
      expect(parent?.slug).toBe("mehfil-e-naat-2025");
    });

    it("returns null when no candidate matches existing events", () => {
      const existing = [
        { slug: "some-other-slug", title: "Unrelated" },
      ];

      const parent = findParentEvent("mehfil-e-naat-2025-tilawat", existing);
      expect(parent).toBeNull();
    });
  });

  describe("getChildSubHeading", () => {
    it("strips parent title prefix and hyphen separator", () => {
      expect(
        getChildSubHeading("Mehfil-e-Naat 2025", "Mehfil-e-Naat 2025 - Tilawat")
      ).toBe("Tilawat");
    });

    it("strips parent title prefix with colon separator", () => {
      expect(
        getChildSubHeading("AI & IT Expo 2025", "AI & IT Expo 2025: Speed Coding")
      ).toBe("Speed Coding");
    });

    it("strips parent title prefix with en-dash or em-dash", () => {
      expect(
        getChildSubHeading("Sports Gala", "Sports Gala – Table Tennis")
      ).toBe("Table Tennis");
      expect(
        getChildSubHeading("Sports Gala", "Sports Gala — Football")
      ).toBe("Football");
    });

    it("falls back to child title if child does not start with parent title", () => {
      expect(
        getChildSubHeading("Sports Gala 2025", "Chess Open Tournament")
      ).toBe("Chess Open Tournament");
    });

    it("falls back to child title if stripping leaves nothing", () => {
      expect(
        getChildSubHeading("Annual Showcase", "Annual Showcase")
      ).toBe("Annual Showcase");
    });
  });
});
