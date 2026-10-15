import { describe, it, expect } from "vitest";
import { escapeCsvCell, buildCsv } from "@/features/admin/admin.utils";

describe("Admin Utilities - CSV Sanitization and Escaping", () => {
  describe("escapeCsvCell", () => {
    it("neutralizes formula injection characters (=, +, -, @)", () => {
      expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(escapeCsvCell("+1234567890")).toBe("'+1234567890");
      expect(escapeCsvCell("-50")).toBe("'-50");
      expect(escapeCsvCell("@username")).toBe("'@username");
      expect(escapeCsvCell("  =cmd|' /C calc'!A0")).toBe("'  =cmd|' /C calc'!A0");
    });

    it("escapes quotes and wraps values with commas in double quotes", () => {
      expect(escapeCsvCell("Hello, World")).toBe('"Hello, World"');
      expect(escapeCsvCell('Said "Hello" to friend')).toBe(
        '"Said ""Hello"" to friend"'
      );
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("combines CSV injection protection with quote escaping", () => {
      expect(escapeCsvCell('=1+1, said "calc"')).toBe(
        '"\'=1+1, said ""calc"""'
      );
    });

    it("handles null, undefined, numbers and booleans safely", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
      expect(escapeCsvCell(42)).toBe("42");
      expect(escapeCsvCell(true)).toBe("true");
    });
  });

  describe("buildCsv", () => {
    it("builds a multi-row CSV compliant with RFC 4180", () => {
      const headers = ["ID", "Name", "Score", "Notes"];
      const rows = [
        ["1", "Alice", 100, "Good job"],
        ["2", "Bob, Jr.", 95, 'Said "Great!"'],
        ["3", "=2+2", -10, "@admin"],
      ];

      const csv = buildCsv(headers, rows);
      const lines = csv.split("\r\n");

      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe("ID,Name,Score,Notes");
      expect(lines[1]).toBe("1,Alice,100,Good job");
      expect(lines[2]).toBe('2,"Bob, Jr.",95,"Said ""Great!"""');
      expect(lines[3]).toBe("3,'=2+2,'-10,'@admin");
    });
  });
});
