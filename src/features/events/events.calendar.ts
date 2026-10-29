import type { EventStatus } from "@/lib/db-types";
import { getEffectiveStatus } from "./events.derived";

export const DEFAULT_EVENT_DURATION_MINUTES = 120;

export interface CalendarEventInput {
  id: string;
  slug?: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: EventStatus | string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  registrationDeadline?: Date | string;
  resultsPublished?: boolean;
}

export interface BuildIcsOptions {
  eventUrl?: string;
  dtstamp?: Date;
}

/**
 * Convert Date to compact UTC string format (YYYYMMDDTHHMMSSZ) required by iCalendar and Google Calendar.
 */
function formatUtcIsoCompact(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape backslash, semicolon, comma, and newlines in text values per RFC 5545 §3.3.11.
 * Note: Backslash must be escaped first so added escape slashes are not re-escaped.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Get byte length of a string in UTF-8.
 */
function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Fold lines longer than 75 octets per RFC 5545 §3.1.
 * Continuation lines begin with a single space.
 * Appends standard CRLF (\r\n) line endings.
 */
function foldLine(line: string): string {
  if (getByteLength(line) <= 75) {
    return line + "\r\n";
  }

  const chars = Array.from(line);
  const foldedLines: string[] = [];
  let currentLine = "";
  let maxBytes = 75;

  for (const char of chars) {
    const charBytes = getByteLength(char);
    const currentBytes = getByteLength(currentLine);

    if (currentBytes + charBytes > maxBytes) {
      foldedLines.push(currentLine);
      currentLine = " " + char;
      maxBytes = 75;
    } else {
      currentLine += char;
    }
  }

  if (currentLine.length > 0) {
    foldedLines.push(currentLine);
  }

  return foldedLines.join("\r\n") + "\r\n";
}

/**
 * Calculate the calendar end time for an event:
 * endsAt if present and strictly after startsAt, otherwise startsAt + DEFAULT_EVENT_DURATION_MINUTES (120 min).
 */
export function getEventCalendarEnd(event: {
  startsAt: Date | string;
  endsAt?: Date | string | null;
}): Date {
  const start = new Date(event.startsAt);
  if (event.endsAt) {
    const end = new Date(event.endsAt);
    if (!isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      return end;
    }
  }
  return new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);
}

/**
 * Check if an event can be added to calendar.
 * Returns false for DRAFT, CANCELLED, or events that are already completed/over.
 */
export function isCalendarEligible(event: {
  status: EventStatus | string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  registrationDeadline?: Date | string;
  resultsPublished?: boolean;
}): boolean {
  if (event.status === "DRAFT" || event.status === "CANCELLED") {
    return false;
  }

  if (event.status === "COMPLETED" || event.resultsPublished) {
    return false;
  }

  const now = Date.now();

  // If endsAt is present and in the past, or registration deadline is present and effective status is COMPLETED
  if (event.registrationDeadline) {
    const effective = getEffectiveStatus({
      status: event.status as EventStatus,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationDeadline: event.registrationDeadline,
      resultsPublished: event.resultsPublished,
    });
    if (effective === "COMPLETED") {
      return false;
    }
  }

  const end = getEventCalendarEnd(event);
  if (now >= end.getTime()) {
    return false;
  }

  return true;
}

/**
 * Build a valid iCalendar (RFC 5545) string for one event.
 * Uses CRLF line endings and wraps at <= 75 octets.
 */
export function buildIcs(event: CalendarEventInput, options?: BuildIcsOptions): string {
  const start = new Date(event.startsAt);
  const end = getEventCalendarEnd(event);
  const dtstamp = options?.dtstamp || new Date();

  const startUtc = formatUtcIsoCompact(start);
  const endUtc = formatUtcIsoCompact(end);
  const stampUtc = formatUtcIsoCompact(dtstamp);

  const uid = `${event.id}@forte-arena`;

  const url = options?.eventUrl || (event.slug ? `/events/${event.slug}` : "");
  const descParts: string[] = [];
  if (event.summary && event.summary.trim()) {
    descParts.push(event.summary.trim());
  } else if (event.description && event.description.trim()) {
    descParts.push(event.description.trim());
  }
  if (url) {
    descParts.push(url);
  }
  const rawDescription = descParts.join("\n\n");
  const venueLocation = event.venue || event.location || "";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Forte Arena//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stampUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(rawDescription)}`,
  ];

  if (venueLocation && venueLocation.trim()) {
    lines.push(`LOCATION:${escapeIcsText(venueLocation.trim())}`);
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "TRIGGER:-PT60M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.map((l) => foldLine(l)).join("");
}

/**
 * Build a Google Calendar template URL for direct web browser calendar addition.
 */
export function buildGoogleCalendarUrl(
  event: CalendarEventInput,
  options?: { eventUrl?: string }
): string {
  const start = new Date(event.startsAt);
  const end = getEventCalendarEnd(event);

  const startUtc = formatUtcIsoCompact(start);
  const endUtc = formatUtcIsoCompact(end);

  const url = options?.eventUrl || (event.slug ? `/events/${event.slug}` : "");
  const descParts: string[] = [];
  if (event.summary && event.summary.trim()) {
    descParts.push(event.summary.trim());
  } else if (event.description && event.description.trim()) {
    descParts.push(event.description.trim());
  }
  if (url) {
    descParts.push(url);
  }
  const rawDescription = descParts.join("\n\n");
  const location = event.venue || event.location || "";

  const queryParts = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(event.title)}`,
    `dates=${startUtc}/${endUtc}`,
    `details=${encodeURIComponent(rawDescription)}`,
    `location=${encodeURIComponent(location)}`,
  ];

  return `https://calendar.google.com/calendar/render?${queryParts.join("&")}`;
}
