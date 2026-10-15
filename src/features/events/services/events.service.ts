import {
  EventsRepository,
  type EventsQueryFilters,
} from "../repositories/events.repository";
import type { EventCategory } from "@/lib/db-types";
import {
  getDerivedStatus,
  getRemainingSeats,
  decorateEvent,
  type DerivedEventStatus,
  type EventWithDerivedStatus,
  type EventCardItem,
} from "../events.derived";

export type { DerivedEventStatus, EventWithDerivedStatus, EventCardItem };

export class EventsService {
  static getDerivedStatus = getDerivedStatus;
  static getRemainingSeats = getRemainingSeats;
  static decorateEvent = decorateEvent;

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
