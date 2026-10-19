import type { EventStatus } from "@/lib/db-types";

/**
 * Event statuses where attendance check-in is permitted.
 * - PUBLISHED: Active event where registrations are open or event is upcoming.
 * - CLOSED: Registrations have stopped / deadline passed, event is ongoing or about to occur.
 * Blocked: DRAFT (unreleased), COMPLETED (event is finished), CANCELLED (called off).
 */
export const ATTENDANCE_ALLOWED_EVENT_STATUSES: readonly EventStatus[] = [
  "PUBLISHED",
  "CLOSED",
] as const;

export function isEventAttendanceAllowed(status: EventStatus | string): boolean {
  return (ATTENDANCE_ALLOWED_EVENT_STATUSES as readonly string[]).includes(status);
}

export function getAttendanceClosedNoticeText(status: EventStatus | string): string {
  switch (status) {
    case "COMPLETED":
      return "This event has ended. Check-in is closed.";
    case "CANCELLED":
      return "This event was cancelled.";
    case "DRAFT":
      return "This event is not open yet.";
    default:
      return "Entry passes will become active on event day.";
  }
}

/**
 * Friendly rejection message for events where attendance is not currently allowed.
 */
export function getEventNotOpenMessage(status: EventStatus | string): string {
  const normalized = typeof status === "string" ? status.toUpperCase() : status;
  switch (normalized) {
    case "COMPLETED":
      return "This event has ended — attendance can no longer be recorded.";
    case "CANCELLED":
      return "This event was cancelled.";
    case "DRAFT":
      return "This event is not published yet.";
    default:
      return "This event is closed — attendance can no longer be recorded for it.";
  }
}

/**
 * Result card title for EVENT_NOT_OPEN based on event lifecycle status.
 */
export function getEventNotOpenCardTitle(status?: EventStatus | string): string {
  const normalized = typeof status === "string" ? status.toUpperCase() : status;
  switch (normalized) {
    case "CANCELLED":
      return "Event Cancelled";
    case "DRAFT":
      return "Not Published";
    case "COMPLETED":
    default:
      return "Event Closed";
  }
}

/**
 * Sort events for the organizer scan console:
 * 1. Events where attendance is currently allowed (derived status PUBLISHED or CLOSED) come first,
 *    ordered by nearest start time to now.
 * 2. Then the rest (COMPLETED, CANCELLED, DRAFT) with the most recent first (descending start date).
 */
export function sortEventsForScanner<
  T extends { startsAt: Date | string; status: EventStatus | string }
>(events: T[], now: Date = new Date()): T[] {
  const nowMs = now.getTime();

  return [...events].sort((a, b) => {
    const aAllowed = isEventAttendanceAllowed(a.status);
    const bAllowed = isEventAttendanceAllowed(b.status);

    if (aAllowed && !bAllowed) return -1;
    if (!aAllowed && bAllowed) return 1;

    const aTime = new Date(a.startsAt).getTime();
    const bTime = new Date(b.startsAt).getTime();

    if (aAllowed && bAllowed) {
      // Both allowed: nearest start time to now first
      const aDiff = Math.abs(aTime - nowMs);
      const bDiff = Math.abs(bTime - nowMs);
      if (aDiff !== bDiff) {
        return aDiff - bDiff;
      }
      return aTime - bTime;
    }

    // Both not allowed: most recent first (descending start date)
    return bTime - aTime;
  });
}

