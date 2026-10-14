import { env } from "@/config/env";

const TIMEZONE = env.APP_TIMEZONE || "Asia/Karachi";

export function toDate(date: Date | string | number): Date {
  return typeof date === "string" || typeof date === "number" ? new Date(date) : date;
}

/**
 * Format full date, e.g., "Saturday, 24 October 2026"
 */
export function formatEventFullDate(date: Date | string): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format medium date, e.g., "Sat, Oct 24, 2026"
 */
export function formatEventDate(date: Date | string): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format date & time, e.g., "Oct 24, 2026, 6:00 PM"
 */
export function formatEventDateTime(date: Date | string): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format time only, e.g., "6:00 PM"
 */
export function formatEventTime(date: Date | string): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format deadline with hour and minute, e.g., "Oct 22, 2026 • 11:59 PM"
 */
export function formatDeadline(date: Date | string): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Returns structured parts for calendar date badge (e.g., day: "24", month: "OCT")
 */
export function getDateParts(date: Date | string): { day: string; month: string; year: string } {
  const d = toDate(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = (parts.find((p) => p.type === "month")?.value || "").toUpperCase();
  const year = parts.find((p) => p.type === "year")?.value || "";
  return { day, month, year };
}

/**
 * Checks whether a given timestamp has passed
 */
export function isPast(date: Date | string): boolean {
  return toDate(date).getTime() < Date.now();
}

/**
 * Calculates remaining milliseconds until a future date
 */
export function getRemainingMs(date: Date | string): number {
  return Math.max(0, toDate(date).getTime() - Date.now());
}

/**
 * Checks if a date is within `hours` from right now
 */
export function isWithinHours(date: Date | string, hours: number): boolean {
  const ms = getRemainingMs(date);
  return ms > 0 && ms <= hours * 3600 * 1000;
}
