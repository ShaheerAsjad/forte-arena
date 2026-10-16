import { describe, it, expect } from "vitest";
import {
  isValidHttpUrl,
  announcementFormSchema,
  sortAnnouncements,
  filterVisibleAnnouncements,
} from "@/features/announcements/announcements.rules";

describe("Announcements Rules: Link URL Validation", () => {
  it("approves valid http and https URLs", () => {
    expect(isValidHttpUrl("http://example.com/rulebook.pdf")).toBe(true);
    expect(isValidHttpUrl("https://example.com/guide")).toBe(true);
    expect(isValidHttpUrl("https://drive.google.com/file/d/123")).toBe(true);
  });

  it("permits null, undefined, or empty URLs as links are optional", () => {
    expect(isValidHttpUrl(null)).toBe(true);
    expect(isValidHttpUrl(undefined)).toBe(true);
    expect(isValidHttpUrl("")).toBe(true);
    expect(isValidHttpUrl("   ")).toBe(true);
  });

  it("rejects malicious, non-http, and relative link URLs", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
    expect(isValidHttpUrl("ftp://ftp.example.com/file")).toBe(false);
    expect(isValidHttpUrl("/internal/path/relative")).toBe(false);
    expect(isValidHttpUrl("file:///C:/passwords.txt")).toBe(false);
    expect(isValidHttpUrl("not-a-valid-url")).toBe(false);
  });
});

describe("Announcements Rules: Sorting & Visibility", () => {
  const items = [
    { id: "1", title: "Older unpinned", pinned: false, isVisible: true, createdAt: new Date("2026-10-10") },
    { id: "2", title: "Newer unpinned", pinned: false, isVisible: true, createdAt: new Date("2026-10-14") },
    { id: "3", title: "Older pinned", pinned: true, isVisible: true, createdAt: new Date("2026-10-11") },
    { id: "4", title: "Newer pinned", pinned: true, isVisible: true, createdAt: new Date("2026-10-15") },
    { id: "5", title: "Draft hidden", pinned: true, isVisible: false, createdAt: new Date("2026-10-16") },
  ];

  it("sorts pinned announcements before unpinned, with newest first within each tier", () => {
    const sorted = sortAnnouncements(items);
    expect(sorted.map((i) => i.id)).toEqual(["5", "4", "3", "2", "1"]);
  });

  it("filters out hidden announcements so public feed only shows visible notices", () => {
    const visibleOnly = filterVisibleAnnouncements(items);
    expect(visibleOnly.length).toBe(4);
    expect(visibleOnly.some((i) => i.id === "5")).toBe(false);
  });
});

describe("Announcements Rules: Zod Form Validation", () => {
  it("accepts valid announcement payload", () => {
    const valid = {
      title: "Schedule Revision for Day 2",
      body: "Please note that all debate fixtures will commence at 10:00 AM sharp in Hall B.",
      pinned: true,
      isVisible: true,
      linkUrl: "https://example.com/schedule",
      linkLabel: "View Schedule",
    };
    const parsed = announcementFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects title shorter than 3 characters", () => {
    const invalid = {
      title: "Hi",
      body: "Valid body text here.",
    };
    const parsed = announcementFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("at least 3 characters");
  });

  it("rejects body shorter than 5 characters", () => {
    const invalid = {
      title: "Valid Title",
      body: "Tiny",
    };
    const parsed = announcementFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("at least 5 characters");
  });

  it("rejects link URL without link label", () => {
    const invalid = {
      title: "Valid Title",
      body: "Valid body text here.",
      linkUrl: "https://example.com",
      linkLabel: "",
    };
    const parsed = announcementFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("Please provide a label for the link");
  });

  it("rejects invalid link protocol (e.g. javascript:)", () => {
    const invalid = {
      title: "Valid Title",
      body: "Valid body text here.",
      linkUrl: "javascript:void(0)",
      linkLabel: "Click Me",
    };
    const parsed = announcementFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("must start with http:// or https://");
  });
});
