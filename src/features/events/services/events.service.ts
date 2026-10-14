import {
  EventsRepository,
  type EventCardItem,
  type EventsQueryFilters,
} from "../repositories/events.repository";
import type { EventStatus, EventCategory } from "@/generated/prisma";

export type DerivedEventStatus =
  | "Upcoming"
  | "Registration Open"
  | "Closing Soon"
  | "Closed"
  | "Completed";

export interface EventWithDerivedStatus<T extends EventCardItem> {
  item: T;
  derivedStatus: DerivedEventStatus;
  remainingSeats: number | null;
}

export class EventsService {
  /**
   * Derive status badge display state per plan section 8
   */
  static getDerivedStatus(event: {
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
   * Calculate seats left
   */
  static getRemainingSeats(event: {
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
  static decorateEvent<T extends EventCardItem>(event: T): EventWithDerivedStatus<T> {
    return {
      item: event,
      derivedStatus: this.getDerivedStatus(event),
      remainingSeats: this.getRemainingSeats(event),
    };
  }

  /**
   * Featured events for homepage
   */
  static async getFeaturedEvents(limit = 6) {
    const events = await EventsRepository.getFeaturedEvents(limit);
    return events.map((e) => this.decorateEvent(e));
  }

  /**
   * Next upcoming event for hero countdown
   */
  static async getNextUpcomingEvent() {
    const event = await EventsRepository.getNextUpcomingEvent();
    return event ? this.decorateEvent(event) : null;
  }

  /**
   * Search and paginated events list
   */
  static async getPaginatedEvents(filters: EventsQueryFilters) {
    const result = await EventsRepository.getPaginatedEvents(filters);
    return {
      ...result,
      events: result.events.map((e) => this.decorateEvent(e)),
    };
  }

  /**
   * Event details by slug
   */
  static async getEventDetails(slug: string) {
    const event = await EventsRepository.getEventBySlug(slug);
    if (!event) return null;
    return this.decorateEvent(event);
  }

  /**
   * Related events
   */
  static async getRelatedEvents(
    category: EventCategory,
    currentSlug: string,
    limit = 3
  ) {
    const events = await EventsRepository.getRelatedEvents(category, currentSlug, limit);
    return events.map((e) => this.decorateEvent(e));
  }
}
