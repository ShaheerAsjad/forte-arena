import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export type EventCategory =
  | "TECHNICAL"
  | "SPORTS"
  | "CULTURAL"
  | "ACADEMIC"
  | "GAMING"
  | "OTHER";

export interface RawEventInput {
  slug: string;
  title: string;
  categoryHint: string;
  startsAt: string | null;
  dateKnown?: boolean;
  timeAssumed?: boolean;
  venue: string | null;
  venueAssumed?: boolean;
  summary: string;
  description: string;
  posterFile: string;
  posterNote?: string;
}

export interface EventDefaults {
  status: "COMPLETED";
  resultsPublished: boolean;
  participationType: "INDIVIDUAL";
  minTeamSize: number;
  maxTeamSize: number;
  maxParticipants: null;
  endsAt: null;
  registrationDeadline: string;
  rules: string;
  eligibility: string;
  prizes: string;
}

export interface EventsJsonFile {
  meta?: {
    purpose?: string;
    source?: string;
    timezone?: string;
    defaultStartTimeIfOnlyDateKnown?: string;
  };
  defaults: EventDefaults;
  events: RawEventInput[];
}

export interface PreparedEvent {
  slug: string;
  title: string;
  summary: string;
  description: string;
  rules: string;
  eligibility: string;
  prizes: string;
  venue: string;
  category: EventCategory;
  status: "COMPLETED";
  participationType: "INDIVIDUAL";
  minTeamSize: number;
  maxTeamSize: number;
  maxParticipants: null;
  startsAt: Date;
  endsAt: null;
  registrationDeadline: Date;
  resultsPublished: boolean;
  createdById: string;
  posterFile: string;
}

/**
 * Owner-specified category overrides per event slug.
 */
export const OWNER_CATEGORY_OVERRIDES: Record<string, EventCategory> = {
  "mango-carnival-2025": "OTHER",
  "welcome-party-2025": "OTHER",
  "forte-alpine-adventure-snow-edition": "OTHER",
  "qurban-carnival-2025": "CULTURAL",
  "mehfil-e-naat-2025": "CULTURAL",
  "culture-festival": "CULTURAL",
  "ai-and-it-expo-2025": "TECHNICAL",
};

/**
 * Maps category hints to the existing EventCategory Prisma enum values.
 * Uses owner override if defined for the specific event slug.
 */
export function mapCategory(hint: string, slug?: string): EventCategory {
  if (slug && OWNER_CATEGORY_OVERRIDES[slug]) {
    return OWNER_CATEGORY_OVERRIDES[slug];
  }

  const normalized = (hint || "").toLowerCase().trim();

  if (
    normalized.includes("tech") ||
    normalized.includes("ai") ||
    normalized.includes("it") ||
    normalized.includes("code")
  ) {
    return "TECHNICAL";
  }

  if (
    normalized.includes("trip") ||
    normalized.includes("adventure") ||
    normalized.includes("recreation") ||
    normalized.includes("sport")
  ) {
    return "SPORTS";
  }

  if (
    normalized.includes("cultural") ||
    normalized.includes("festival") ||
    normalized.includes("social") ||
    normalized.includes("religious") ||
    normalized.includes("naat") ||
    normalized.includes("carnival") ||
    normalized.includes("party")
  ) {
    return "CULTURAL";
  }

  if (
    normalized.includes("academic") ||
    normalized.includes("seminar") ||
    normalized.includes("workshop")
  ) {
    return "ACADEMIC";
  }

  if (normalized.includes("gaming") || normalized.includes("esport")) {
    return "GAMING";
  }

  return "OTHER";
}

/**
 * Interprets a date in Asia/Karachi (UTC+5, no DST) and converts it to a UTC Date instant.
 * Supported formats:
 * - Full ISO string with offset: "2025-07-23T10:00:00+05:00"
 * - ISO date without time: "2025-07-23" -> default 10:00 PKT -> 05:00 UTC
 * - Space separated: "2025-07-23 10:00"
 * - DD-MM-YYYY or DD/MM/YYYY: "23-07-2025" or "23/07/2025 14:00"
 */
export function parsePktDateToUtc(
  dateInput: string | Date | null | undefined,
  defaultTime = "10:00"
): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  const trimmed = dateInput.trim();
  if (!trimmed || trimmed === "____" || trimmed.startsWith("_")) return null;

  // If already contains timezone offset (+05:00, Z, etc.)
  if (trimmed.includes("T") && (trimmed.includes("+") || trimmed.includes("Z") || trimmed.includes("-", 8))) {
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Regex matches: YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY with optional time
  let year: number;
  let month: number; // 1-12
  let day: number;
  let hours = 10;
  let minutes = 0;

  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
    if (isoMatch[4] !== undefined && isoMatch[5] !== undefined) {
      hours = parseInt(isoMatch[4], 10);
      minutes = parseInt(isoMatch[5], 10);
    } else {
      const [defH, defM] = defaultTime.split(":").map((v) => parseInt(v, 10));
      hours = isNaN(defH) ? 10 : defH;
      minutes = isNaN(defM) ? 0 : defM;
    }
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
    if (dmyMatch[4] !== undefined && dmyMatch[5] !== undefined) {
      hours = parseInt(dmyMatch[4], 10);
      minutes = parseInt(dmyMatch[5], 10);
    } else {
      const [defH, defM] = defaultTime.split(":").map((v) => parseInt(v, 10));
      hours = isNaN(defH) ? 10 : defH;
      minutes = isNaN(defM) ? 0 : defM;
    }
  } else {
    // Attempt standard parse
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
    return null;
  }

  // Convert PKT (UTC+5) to UTC by subtracting 5 hours
  const utcMillis = Date.UTC(year, month - 1, day, hours - 5, minutes, 0, 0);
  const dateObj = new Date(utcMillis);
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

/**
 * Prepares a database event payload from raw JSON input.
 * Returns null if the event date is missing.
 */
export function prepareEvent(
  raw: RawEventInput,
  defaults: EventDefaults,
  organizerId: string,
  overrides?: {
    customDate?: string;
    customVenue?: string;
    customCategory?: EventCategory;
  }
): PreparedEvent | null {
  const dateStr = overrides?.customDate || raw.startsAt;
  const parsedStartsAt = parsePktDateToUtc(dateStr);

  // An event whose date is missing must NOT be imported
  if (!parsedStartsAt) {
    return null;
  }

  const venue = overrides?.customVenue || raw.venue || "Forté Colleges of Excellence, Sargodha Campus, 91-A Satellite Town, Sargodha";
  const category = overrides?.customCategory || mapCategory(raw.categoryHint, raw.slug);

  return {
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    rules: defaults.rules,
    eligibility: defaults.eligibility,
    prizes: defaults.prizes,
    venue,
    category,
    status: "COMPLETED",
    participationType: "INDIVIDUAL",
    minTeamSize: defaults.minTeamSize,
    maxTeamSize: defaults.maxTeamSize,
    maxParticipants: defaults.maxParticipants,
    startsAt: parsedStartsAt,
    endsAt: null,
    registrationDeadline: parsedStartsAt, // same instant as startsAt
    resultsPublished: defaults.resultsPublished,
    createdById: organizerId,
    posterFile: raw.posterFile,
  };
}

export function parseCliArgs(argv: string[]): {
  dataDir?: string;
  isExecute: boolean;
} {
  let dataDir: string | undefined;
  const dataDirArg = argv.find((a) => a.startsWith("--data-dir="));
  if (dataDirArg) {
    dataDir = dataDirArg.substring("--data-dir=".length).trim();
  }
  const isExecute = argv.includes("--execute");
  return { dataDir, isExecute };
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

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

export async function runImportScript(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { dataDir, isExecute } = parseCliArgs(argv);

  if (!dataDir) {
    console.error("Usage: npx tsx scripts/import-past-events.ts --data-dir=<path-to-folder> [--execute]");
    process.exitCode = 1;
    return;
  }

  const resolvedDir = path.resolve(dataDir);
  const eventsJsonPath = path.join(resolvedDir, "events.json");

  if (!fs.existsSync(eventsJsonPath)) {
    console.error(`Error: events.json not found at ${eventsJsonPath}`);
    process.exitCode = 1;
    return;
  }

  const rawJsonContent = fs.readFileSync(eventsJsonPath, "utf-8");
  const data: EventsJsonFile = JSON.parse(rawJsonContent);

  const { pool, prisma } = createPrismaClient();

  try {
    // Verify organizer user
    const organizers = await prisma.user.findMany({
      where: { role: { in: ["ORGANIZER", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true },
    });

    if (organizers.length === 0) {
      console.error("Error: No ORGANIZER or ADMIN user found in the database. Cannot assign createdById.");
      process.exitCode = 1;
      return;
    }

    const defaultOrganizer = organizers[0];

    // Check existing slugs in database
    const existingEvents = await prisma.event.findMany({
      select: { slug: true },
    });
    const existingSlugSet = new Set(existingEvents.map((e) => e.slug));

    console.log("=========================================");
    console.log("Forté Arena - Past Events Import");
    console.log("=========================================");
    console.log(`Data directory:     ${resolvedDir}`);
    console.log(`Organizer assigned: ${defaultOrganizer.name} (${defaultOrganizer.email}) [${defaultOrganizer.id}]`);
    console.log(`Mode:               ${isExecute ? "EXECUTE" : "DRY RUN"}`);
    console.log(`Total events in file: ${data.events.length}`);
    console.log("=========================================\n");

    const preparedList: {
      prepared: PreparedEvent | null;
      raw: RawEventInput;
      posterPath: string;
      posterSize: number;
      slugExists: boolean;
    }[] = [];

    for (const raw of data.events) {
      const posterPath = path.join(resolvedDir, raw.posterFile);
      let posterSize = 0;
      if (fs.existsSync(posterPath)) {
        posterSize = fs.statSync(posterPath).size;
      }

      const slugExists = existingSlugSet.has(raw.slug);
      const prepared = prepareEvent(raw, data.defaults, defaultOrganizer.id);

      preparedList.push({
        prepared,
        raw,
        posterPath,
        posterSize,
        slugExists,
      });

      console.log(`[Event] ${raw.title} (${raw.slug})`);
      console.log(`  - Category:       ${prepared?.category ?? mapCategory(raw.categoryHint, raw.slug)}`);
      console.log(`  - Venue:          ${prepared?.venue ?? raw.venue ?? "(missing)"}`);
      console.log(`  - StartsAt (UTC): ${prepared?.startsAt ? prepared.startsAt.toISOString() : "(MISSING - date not specified)"}`);
      if (prepared?.startsAt) {
        const pktTime = new Date(prepared.startsAt.getTime() + 5 * 60 * 60 * 1000).toISOString().replace("Z", "+05:00");
        console.log(`  - StartsAt (PKT): ${pktTime}`);
      }
      console.log(`  - Poster:         ${raw.posterFile} (${posterSize > 0 ? `${(posterSize / 1024).toFixed(1)} KB` : "FILE NOT FOUND"})`);
      console.log(`  - Slug in DB:     ${slugExists ? "EXISTS (will skip)" : "New"}`);
      console.log(`  - Status:         ${prepared ? (slugExists ? "SKIP (already in DB)" : "READY TO IMPORT") : "SKIP (missing date)"}\n`);
    }

    if (!isExecute) {
      console.log("DRY RUN COMPLETED. No files uploaded and no database rows written.");
      console.log("To execute the import, re-run with --execute.");
      return;
    }

    // EXECUTION MODE
    console.log("\nStarting import execution...\n");

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "event-media";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const createdEvents: {
      slug: string;
      title: string;
      status: string;
      startsAt: string;
      posterUrl: string;
      httpStatus?: number;
    }[] = [];

    for (const item of preparedList) {
      if (!item.prepared) {
        console.log(`Skipping "${item.raw.title}": date is missing.`);
        continue;
      }
      if (item.slugExists) {
        console.log(`Skipping "${item.prepared.title}": slug "${item.prepared.slug}" already exists in database.`);
        continue;
      }

      if (!fs.existsSync(item.posterPath)) {
        console.error(`Error: Poster file not found at ${item.posterPath}. Skipping.`);
        continue;
      }

      const fileBuffer = fs.readFileSync(item.posterPath);
      const ext = path.extname(item.posterPath).replace(".", "") || "jpg";
      const randomFilename = `${crypto.randomUUID()}.${ext}`;
      const storageFilePath = `posters/${randomFilename}`;
      const mimeType = getMimeType(item.posterPath);

      console.log(`Uploading poster for "${item.prepared.title}" -> ${storageFilePath}...`);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storageFilePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload poster for "${item.prepared.title}": ${uploadError.message}`);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storageFilePath);

      const posterUrl = publicUrlData.publicUrl;

      try {
        await prisma.event.create({
          data: {
            slug: item.prepared.slug,
            title: item.prepared.title,
            summary: item.prepared.summary,
            description: item.prepared.description,
            rules: item.prepared.rules,
            eligibility: item.prepared.eligibility,
            prizes: item.prepared.prizes,
            venue: item.prepared.venue,
            category: item.prepared.category,
            status: item.prepared.status,
            participationType: item.prepared.participationType,
            minTeamSize: item.prepared.minTeamSize,
            maxTeamSize: item.prepared.maxTeamSize,
            maxParticipants: item.prepared.maxParticipants,
            startsAt: item.prepared.startsAt,
            endsAt: item.prepared.endsAt,
            registrationDeadline: item.prepared.registrationDeadline,
            posterUrl,
            resultsPublished: item.prepared.resultsPublished,
            createdById: item.prepared.createdById,
          },
        });

        // Verify URL accessibility
        let httpStatus: number | undefined;
        try {
          const res = await fetch(posterUrl, { method: "HEAD" });
          httpStatus = res.status;
        } catch {
          httpStatus = undefined;
        }

        createdEvents.push({
          slug: item.prepared.slug,
          title: item.prepared.title,
          status: item.prepared.status,
          startsAt: item.prepared.startsAt.toISOString(),
          posterUrl,
          httpStatus,
        });

        console.log(`Successfully created event: "${item.prepared.title}" (HTTP Status: ${httpStatus})\n`);
      } catch (dbErr) {
        console.error(`Failed to insert event into DB. Deleting uploaded poster to prevent orphans...`);
        await supabase.storage.from(bucket).remove([storageFilePath]);
        console.error(`Error details:`, dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }

    console.log("\n=========================================");
    console.log("IMPORT EXECUTION SUMMARY");
    console.log("=========================================");
    console.log(`Successfully created ${createdEvents.length} events:`);
    for (const evt of createdEvents) {
      console.log(`- ${evt.title} (${evt.slug})`);
      console.log(`  StartsAt:    ${evt.startsAt}`);
      console.log(`  PosterURL:   ${evt.posterUrl}`);
      console.log(`  HTTP Status: ${evt.httpStatus ?? "UNKNOWN"}`);
    }

    const finalCount = await prisma.event.count();
    console.log(`\nTotal events in database now: ${finalCount}`);
  } finally {
    await pool.end();
  }
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  /import-past-events\.(ts|js)$/.test(process.argv[1])
) {
  runImportScript().catch((err) => {
    console.error("Fatal error during event import:", err);
    process.exit(1);
  });
}
