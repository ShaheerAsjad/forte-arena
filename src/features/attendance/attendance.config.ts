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
