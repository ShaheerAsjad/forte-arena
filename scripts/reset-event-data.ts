import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export interface ResetPlanItem {
  model: string;
  table: string;
  filter: "all" | "event-linked-only";
  parents: string[];
}

export interface ResetPlan {
  protectedModels: readonly string[];
  protectedTables: readonly string[];
  eventModels: readonly string[];
  deleteOrder: readonly ResetPlanItem[];
}

/**
 * Returns the immutable reset plan defining the exact delete order and protected tables.
 * Can be unit-tested without connecting to a database.
 */
export function getResetPlan(): ResetPlan {
  return {
    protectedModels: ["User", "Session", "Account", "Verification"],
    protectedTables: ["users", "session", "account", "verification"],
    eventModels: [
      "Feedback",
      "Result",
      "TeamMember",
      "Registration",
      "Team",
      "Announcement",
      "Event",
    ],
    deleteOrder: [
      {
        model: "Feedback",
        table: "feedbacks",
        filter: "all",
        parents: ["Event", "User"],
      },
      {
        model: "Result",
        table: "results",
        filter: "all",
        parents: ["Event", "Registration"],
      },
      {
        model: "TeamMember",
        table: "team_members",
        filter: "all",
        parents: ["Team", "User"],
      },
      {
        model: "Registration",
        table: "registrations",
        filter: "all",
        parents: ["Event", "User", "Team"],
      },
      {
        model: "Team",
        table: "teams",
        filter: "all",
        parents: ["Event", "User"],
      },
      {
        model: "Announcement",
        table: "announcements",
        filter: "event-linked-only",
        parents: ["Event", "User"],
      },
      {
        model: "Event",
        table: "events",
        filter: "all",
        parents: ["User"],
      },
    ],
  };
}

/**
 * Extracts ONLY the hostname from a database connection string.
 * Never exposes passwords, usernames, port, database names, or full URLs.
 */
export function extractDbHost(connectionString?: string): string {
  if (!connectionString) {
    return "unknown-host";
  }
  try {
    const parsed = new URL(connectionString);
    return parsed.hostname || "unknown-host";
  } catch {
    const match = connectionString.match(/@([^/:?#]+)/);
    return match ? match[1] : "unknown-host";
  }
}

/**
 * Custom JSON serializer replacer to handle Date, BigInt, and Prisma Decimal objects.
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (
    value !== null &&
    typeof value === "object" &&
    ("isDecimal" in value || "d" in value) &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    return (value as { toString: () => string }).toString();
  }
  return value;
}

/**
 * Formats a timestamp into an ISO-based filename that is safe on all operating systems (e.g. Windows).
 */
export function getBackupFilename(now: Date = new Date()): string {
  const safeTimestamp = now.toISOString().replace(/:/g, "-");
  return `event-data-${safeTimestamp}.json`;
}

/**
 * Serializes data into formatted JSON using the custom replacer.
 */
export function createBackupJson(data: unknown): string {
  return JSON.stringify(data, jsonReplacer, 2);
}

/**
 * Parses CLI arguments for --execute and --confirm-host=<host>.
 */
export function parseArgs(argv: string[]): {
  isExecute: boolean;
  confirmHost?: string;
} {
  const isExecute = argv.includes("--execute");
  const confirmArg = argv.find((arg) => arg.startsWith("--confirm-host="));
  const confirmHost = confirmArg ? confirmArg.substring("--confirm-host=".length).trim() : undefined;
  return { isExecute, confirmHost };
}

/**
 * Factory to create PrismaClient matching the prisma/seed.ts instantiation pattern.
 */
export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { pool, prisma };
}

interface TableCounts {
  feedbacks: number;
  results: number;
  teamMembers: number;
  registrations: number;
  teams: number;
  eventAnnouncements: number;
  generalAnnouncements: number;
  events: number;
  users: number;
  accounts: number;
  sessions: number;
  verifications: number;
}

async function fetchCounts(prisma: PrismaClient): Promise<TableCounts> {
  const [
    feedbacks,
    results,
    teamMembers,
    registrations,
    teams,
    eventAnnouncements,
    generalAnnouncements,
    events,
    users,
    accounts,
    sessions,
    verifications,
  ] = await Promise.all([
    prisma.feedback.count(),
    prisma.result.count(),
    prisma.teamMember.count(),
    prisma.registration.count(),
    prisma.team.count(),
    prisma.announcement.count({ where: { eventId: { not: null } } }),
    prisma.announcement.count({ where: { eventId: null } }),
    prisma.event.count(),
    prisma.user.count(),
    prisma.account.count(),
    prisma.session.count(),
    prisma.verification.count(),
  ]);

  return {
    feedbacks,
    results,
    teamMembers,
    registrations,
    teams,
    eventAnnouncements,
    generalAnnouncements,
    events,
    users,
    accounts,
    sessions,
    verifications,
  };
}

function printCountsTable(title: string, counts: TableCounts) {
  console.log(`\n=== ${title} ===`);
  console.log("EVENT-RELATED TABLES (Scheduled for deletion):");
  console.log(`  - feedbacks:                         ${counts.feedbacks}`);
  console.log(`  - results:                           ${counts.results}`);
  console.log(`  - team_members:                      ${counts.teamMembers}`);
  console.log(`  - registrations:                     ${counts.registrations}`);
  console.log(`  - teams:                             ${counts.teams}`);
  console.log(`  - announcements (event-linked):      ${counts.eventAnnouncements}`);
  console.log(`  - events:                            ${counts.events}`);
  console.log("PROTECTED TABLES (Must be KEPT):");
  console.log(`  - users:                             ${counts.users}`);
  console.log(`  - account:                           ${counts.accounts}`);
  console.log(`  - session:                           ${counts.sessions}`);
  console.log(`  - verification:                      ${counts.verifications}`);
  console.log(`  - announcements (general, no event): ${counts.generalAnnouncements}`);
  console.log("=========================================\n");
}

/**
 * Main execution handler.
 */
export async function runResetScript(argv: string[] = process.argv.slice(2)): Promise<void> {
  const host = extractDbHost(process.env.DATABASE_URL);
  console.log("=========================================");
  console.log("Forté Arena - Event Data Reset Utility");
  console.log("=========================================");
  console.log(`Database Host: ${host}`);

  const { isExecute, confirmHost } = parseArgs(argv);
  const { pool, prisma } = createPrismaClient();

  try {
    const initialCounts = await fetchCounts(prisma);
    printCountsTable("CURRENT DATABASE ROW COUNTS", initialCounts);

    if (!isExecute) {
      console.log("DRY RUN - nothing deleted. Re-run with --execute --confirm-host=" + host + " to delete.");
      return;
    }

    // Validate confirmation host
    if (!confirmHost || confirmHost !== host) {
      console.error("\n[ERROR] --execute requires --confirm-host=<host> equal to the database host.");
      console.error(`  Expected: --confirm-host=${host}`);
      console.error(`  Received: ${confirmHost ? `--confirm-host=${confirmHost}` : "(none)"}`);
      console.error("Aborting without making any changes.\n");
      process.exitCode = 1;
      return;
    }

    console.log("[1/3] Creating JSON backup of all event-related data...");
    let backupFilePath = "";
    try {
      const backupDir = path.resolve(process.cwd(), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const [
        allFeedbacks,
        allResults,
        allTeamMembers,
        allRegistrations,
        allTeams,
        eventAnnouncements,
        allEvents,
      ] = await Promise.all([
        prisma.feedback.findMany(),
        prisma.result.findMany(),
        prisma.teamMember.findMany(),
        prisma.registration.findMany(),
        prisma.team.findMany(),
        prisma.announcement.findMany({ where: { eventId: { not: null } } }),
        prisma.event.findMany(),
      ]);

      const backupData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          databaseHost: host,
          counts: {
            feedbacks: allFeedbacks.length,
            results: allResults.length,
            teamMembers: allTeamMembers.length,
            registrations: allRegistrations.length,
            teams: allTeams.length,
            eventAnnouncements: eventAnnouncements.length,
            events: allEvents.length,
          },
        },
        feedbacks: allFeedbacks,
        results: allResults,
        teamMembers: allTeamMembers,
        registrations: allRegistrations,
        teams: allTeams,
        announcements: eventAnnouncements,
        events: allEvents,
      };

      const backupFilename = getBackupFilename();
      backupFilePath = path.join(backupDir, backupFilename);
      const serialized = createBackupJson(backupData);
      fs.writeFileSync(backupFilePath, serialized, "utf-8");

      const stats = fs.statSync(backupFilePath);
      console.log(`Backup written successfully:`);
      console.log(`  File: ${backupFilePath}`);
      console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
    } catch (backupErr) {
      console.error("\n[FATAL ERROR] Backup creation failed! Aborting. No data was deleted.");
      console.error(backupErr instanceof Error ? backupErr.message : String(backupErr));
      process.exitCode = 1;
      return;
    }

    console.log("\n[2/3] Deleting event-related data in FK-safe order via single transaction...");
    const [
      deletedFeedbacks,
      deletedResults,
      deletedTeamMembers,
      deletedRegistrations,
      deletedTeams,
      deletedAnnouncements,
      deletedEvents,
    ] = await prisma.$transaction([
      prisma.feedback.deleteMany(),
      prisma.result.deleteMany(),
      prisma.teamMember.deleteMany(),
      prisma.registration.deleteMany(),
      prisma.team.deleteMany(),
      prisma.announcement.deleteMany({
        where: { eventId: { not: null } },
      }),
      prisma.event.deleteMany(),
    ]);

    console.log("Transaction succeeded. Deleted rows:");
    console.log(`  - feedbacks:                    ${deletedFeedbacks.count}`);
    console.log(`  - results:                      ${deletedResults.count}`);
    console.log(`  - team_members:                 ${deletedTeamMembers.count}`);
    console.log(`  - registrations:                ${deletedRegistrations.count}`);
    console.log(`  - teams:                        ${deletedTeams.count}`);
    console.log(`  - event-linked announcements:   ${deletedAnnouncements.count}`);
    console.log(`  - events:                       ${deletedEvents.count}`);

    console.log("\n[3/3] Verifying database integrity and protected table counts...");
    const finalCounts = await fetchCounts(prisma);
    printCountsTable("FINAL DATABASE ROW COUNTS", finalCounts);

    const authTampered =
      finalCounts.users !== initialCounts.users ||
      finalCounts.accounts !== initialCounts.accounts ||
      finalCounts.sessions !== initialCounts.sessions ||
      finalCounts.verifications !== initialCounts.verifications;

    if (authTampered) {
      console.error("\n" + "!".repeat(80));
      console.error("CRITICAL ERROR: AUTH/ACCOUNT TABLE COUNTS CHANGED DURING RESET!");
      console.error(`  users:         before=${initialCounts.users}, after=${finalCounts.users}`);
      console.error(`  accounts:      before=${initialCounts.accounts}, after=${finalCounts.accounts}`);
      console.error(`  sessions:      before=${initialCounts.sessions}, after=${finalCounts.sessions}`);
      console.error(`  verifications: before=${initialCounts.verifications}, after=${finalCounts.verifications}`);
      console.error("!".repeat(80) + "\n");
      process.exitCode = 1;
      return;
    }

    if (finalCounts.generalAnnouncements !== initialCounts.generalAnnouncements) {
      console.error("\n[ERROR] General announcements count changed during reset!");
      console.error(
        `  general announcements: before=${initialCounts.generalAnnouncements}, after=${finalCounts.generalAnnouncements}`
      );
      process.exitCode = 1;
      return;
    }

    console.log("INTEGRITY VERIFIED:");
    console.log("  All Auth/Account tables (User, Account, Session, Verification) remain 100% untouched.");
    console.log("  All general announcements (no event) remain intact.");
    console.log("  All demo event-related rows have been successfully reset.");
    console.log("RESET COMPLETED SAFELY.\n");
  } finally {
    await pool.end();
  }
}

// Only run CLI entrypoint if executed directly, not when imported by test runner
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  /reset-event-data\.(ts|js)$/.test(process.argv[1])
) {
  runResetScript().catch((err) => {
    console.error("Fatal uncaught error during reset script execution:", err);
    process.exit(1);
  });
}
