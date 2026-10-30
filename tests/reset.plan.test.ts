import { describe, it, expect } from "vitest";
import {
  getResetPlan,
  extractDbHost,
  parseArgs,
  jsonReplacer,
  getBackupFilename,
} from "../scripts/reset-event-data";

describe("Database Reset Plan and Safety Helpers", () => {
  const plan = getResetPlan();

  it("never includes protected Auth/Account models in the delete order", () => {
    const deletedModelNames = plan.deleteOrder.map((item) => item.model);
    const deletedTableNames = plan.deleteOrder.map((item) => item.table);

    const protectedModels = ["User", "Account", "Session", "Verification"];
    const protectedTables = ["users", "account", "session", "verification"];

    for (const model of protectedModels) {
      expect(deletedModelNames).not.toContain(model);
      expect(plan.protectedModels).toContain(model);
    }

    for (const table of protectedTables) {
      expect(deletedTableNames).not.toContain(table);
      expect(plan.protectedTables).toContain(table);
    }
  });

  it("contains every EVENT-RELATED model found in prisma/schema.prisma", () => {
    const deletedModelNames = plan.deleteOrder.map((item) => item.model);

    const expectedEventModels = [
      "Feedback",
      "Result",
      "TeamMember",
      "Registration",
      "Team",
      "Announcement",
      "Event",
    ];

    expect(deletedModelNames.sort()).toEqual(expectedEventModels.sort());
    expect(plan.eventModels.slice().sort()).toEqual(expectedEventModels.sort());
  });

  it("marks Announcement deletion as event-linked only so general announcements are kept", () => {
    const announcementStep = plan.deleteOrder.find((item) => item.model === "Announcement");
    expect(announcementStep).toBeDefined();
    expect(announcementStep?.filter).toBe("event-linked-only");
  });

  it("lists children strictly before parents according to foreign key constraints", () => {
    const modelOrder = plan.deleteOrder.map((item) => item.model);
    const getIndex = (name: string) => modelOrder.indexOf(name);

    // 1. Result references Registration (Cascade) -> Result must be deleted before Registration
    expect(getIndex("Result")).toBeLessThan(getIndex("Registration"));

    // 2. TeamMember references Team (Cascade) -> TeamMember must be deleted before Team
    expect(getIndex("TeamMember")).toBeLessThan(getIndex("Team"));

    // 3. Registration references Team (SetNull) -> Registration deleted before Team
    expect(getIndex("Registration")).toBeLessThan(getIndex("Team"));

    // 4. All models that reference Event must be deleted before Event
    const eventIndex = getIndex("Event");
    expect(getIndex("Feedback")).toBeLessThan(eventIndex);
    expect(getIndex("Result")).toBeLessThan(eventIndex);
    expect(getIndex("TeamMember")).toBeLessThan(eventIndex);
    expect(getIndex("Registration")).toBeLessThan(eventIndex);
    expect(getIndex("Team")).toBeLessThan(eventIndex);
    expect(getIndex("Announcement")).toBeLessThan(eventIndex);

    // 5. Automated parent-before-child check using the declared FK parents list
    for (const item of plan.deleteOrder) {
      const childIdx = getIndex(item.model);
      for (const parent of item.parents) {
        if (modelOrder.includes(parent)) {
          const parentIdx = getIndex(parent);
          expect(childIdx).toBeLessThan(parentIdx);
        }
      }
    }
  });

  describe("extractDbHost helper", () => {
    it("extracts only hostname and strips username, password, port, and database name", () => {
      const url = "postgresql://postgres.project:SecretPass123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require";
      const host = extractDbHost(url);
      expect(host).toBe("aws-0-ap-southeast-1.pooler.supabase.com");
      expect(host).not.toContain("SecretPass123");
      expect(host).not.toContain("postgres.project");
      expect(host).not.toContain("6543");
      expect(host).not.toContain("sslmode");
    });

    it("handles local postgres URLs", () => {
      expect(extractDbHost("postgresql://user:pass@localhost:5432/mydb")).toBe("localhost");
      expect(extractDbHost("postgres://user:pass@127.0.0.1:5432/mydb")).toBe("127.0.0.1");
    });

    it("returns unknown-host safely for empty or invalid strings without throwing", () => {
      expect(extractDbHost("")).toBe("unknown-host");
      expect(extractDbHost(undefined)).toBe("unknown-host");
      expect(extractDbHost("not-a-valid-url")).toBe("unknown-host");
    });
  });

  describe("parseArgs helper", () => {
    it("defaults to dry-run when --execute is not provided", () => {
      const result = parseArgs([]);
      expect(result.isExecute).toBe(false);
      expect(result.confirmHost).toBeUndefined();
    });

    it("parses --execute and --confirm-host correctly", () => {
      const result = parseArgs([
        "--execute",
        "--confirm-host=aws-0-ap-southeast-1.pooler.supabase.com",
      ]);
      expect(result.isExecute).toBe(true);
      expect(result.confirmHost).toBe("aws-0-ap-southeast-1.pooler.supabase.com");
    });
  });

  describe("jsonReplacer and getBackupFilename", () => {
    it("serializes BigInt, Date, and Decimal types without throwing", () => {
      const testDate = new Date("2026-10-29T18:00:00.000Z");
      const sampleObj = {
        id: "123",
        date: testDate,
        amount: BigInt(9007199254740991),
        score: {
          isDecimal: true,
          toString: () => "98.75",
        },
      };

      const serialized = JSON.stringify(sampleObj, jsonReplacer);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe("123");
      expect(parsed.date).toBe("2026-10-29T18:00:00.000Z");
      expect(parsed.amount).toBe("9007199254740991");
      expect(parsed.score).toBe("98.75");
    });

    it("produces filenames safe on Windows without colons", () => {
      const fixedDate = new Date("2026-10-29T18:30:45.123Z");
      const filename = getBackupFilename(fixedDate);
      expect(filename).toBe("event-data-2026-10-29T18-30-45.123Z.json");
      expect(filename).not.toContain(":");
    });
  });
});
