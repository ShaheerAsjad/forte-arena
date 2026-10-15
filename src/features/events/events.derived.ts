import type { EventStatus, EventCategory, ParticipationType } from "@/lib/db-types";

export type EventCardItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: EventCategory;
  status: EventStatus;
  participationType: ParticipationType;
  minTeamSize: number;
  maxTeamSize: number;
  maxParticipants: number | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
  registrationDeadline: Date | string;
  posterUrl: string | null;
  venue: string;
  _count?: {
    registrations: number;
  };
};

export type DerivedEventStatus =
  | "Upcoming"
  | "Registration Open"
  | "Closing Soon"
  | "Closed"
  | "Completed";

export interface EventWithDerivedStatus<T extends EventCardItem = EventCardItem> {
  item: T;
  derivedStatus: DerivedEventStatus;
  remainingSeats: number | null;
}

/**
 * Derive status badge display state per plan section 8
 */
export function getDerivedStatus(event: {
  status: EventStatus;
  startsAt: Date | string;
  registrationDeadline: Date | string;
  resultsPublished?: boolean;
}): DerivedEventStatus {
  const now = Date.now();
  const startsAt = new Date(event.startsAt).getTime();
  const deadline = new Date(event.registrationDeadline).getTime();

  if (event.status === "COMPLETED" || event.resultsPublished) {
    return "Completed";
  }

  if (event.status === "CLOSED" || event.status === "CANCELLED" || now >= startsAt) {
    return "Closed";
  }

  if (now > deadline) {
    return "Closed";
  }

  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
  if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
    return "Closing Soon";
  }

  if (event.status === "PUBLISHED" && now <= deadline) {
    return "Registration Open";
  }

  return "Upcoming";
}

/**
 * Compute the effective status of an event from dates and stored state without relying on background cron.
 * Used for admin event badges, filtering, and lifecycle resolution.
 */
export function getEffectiveStatus(event: {
  status: EventStatus;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  registrationDeadline: Date | string;
  resultsPublished?: boolean;
}): EventStatus {
  const now = Date.now();
  const { status, startsAt, endsAt, registrationDeadline, resultsPublished } = event;

  // DRAFT and CANCELLED are explicit organizer states
  if (status === "DRAFT" || status === "CANCELLED") {
    return status;
  }

  // Explicitly marked as COMPLETED or results have been published
  if (status === "COMPLETED" || resultsPublished) {
    return "COMPLETED";
  }

  // If endsAt timestamp is defined and has passed
  if (endsAt && now >= new Date(endsAt).getTime()) {
    return "COMPLETED";
  }

  // If manually CLOSED, or event has started, or registration deadline has passed
  const deadline = new Date(registrationDeadline).getTime();
  const start = new Date(startsAt).getTime();

  if (status === "CLOSED" || now >= start || now > deadline) {
    return "CLOSED";
  }

  // Still active and open for registration
  return "PUBLISHED";
}

/**
 * Calculate seats left
 */
export function getRemainingSeats(event: {
  maxParticipants: number | null;
  _count?: { registrations: number };
}): number | null {
  if (event.maxParticipants === null || event.maxParticipants === undefined) {
    return null;
  }
  const approved = event._count?.registrations ?? 0;
  return Math.max(0, event.maxParticipants - approved);
}

/**
 * Attach derived metadata to an event item
 */
export function decorateEvent<T extends EventCardItem>(event: T): EventWithDerivedStatus<T> {
  return {
    item: event,
    derivedStatus: getDerivedStatus(event),
    remainingSeats: getRemainingSeats(event),
  };
}
