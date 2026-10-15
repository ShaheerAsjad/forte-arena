import { describe, it, expect } from "vitest";
import { slugify, generateUniqueSlug } from "@/features/admin/admin.utils";

describe("Admin Utilities - Slug Generation", () => {
  describe("slugify", () => {
    it("converts uppercase, spaces, and punctuation to hyphenated lowercase", () => {
      expect(slugify("CodeSprint Algorithmic Battle 2026!")).toBe(
        "codesprint-algorithmic-battle-2026"
      );
      expect(slugify("Futsal & Frenzy: Cup @ Arena")).toBe(
        "futsal-frenzy-cup-arena"
      );
    });

    it("collapses multiple consecutive dashes and trims edges", () => {
      expect(slugify("---Hello    World---")).toBe("hello-world");
      expect(slugify("Event   --   2026")).toBe("event-2026");
    });

    it("normalizes accented and unicode characters", () => {
      expect(slugify("Café & Forté Arena")).toBe("cafe-forte-arena");
    });

    it("returns empty string when input is empty or falsy", () => {
      expect(slugify("")).toBe("");
      expect(slugify("   ")).toBe("");
    });
  });

  describe("generateUniqueSlug", () => {
    it("returns base slug when it does not exist in database", async () => {
      const checkExists = async () => false;
      const slug = await generateUniqueSlug("RoboWars Arena", checkExists);
      expect(slug).toBe("robowars-arena");
    });

    it("appends numeric suffix when base slug already exists", async () => {
      const existing = new Set(["robowars-arena", "robowars-arena-2"]);
      const checkExists = async (s: string) => existing.has(s);

      const slug = await generateUniqueSlug("RoboWars Arena", checkExists);
      expect(slug).toBe("robowars-arena-3");
    });

    it("preserves current slug when updating the same event", async () => {
      const existing = new Set(["robowars-arena"]);
      const checkExists = async (s: string) => existing.has(s);

      const slug = await generateUniqueSlug(
        "RoboWars Arena",
        checkExists,
        "robowars-arena"
      );
      expect(slug).toBe("robowars-arena");
    });
  });
});
