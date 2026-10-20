import type { EventCategory } from "@/lib/db-types";
import type { EventWithDerivedStatus } from "./events.derived";

export type EventSortOption = "soonest" | "latest" | "az";

export type EventStatusFilter =
  | "ALL"
  | "OPEN" // Registration Open or Closing Soon
  | "CLOSED" // Registration Closed
  | "COMPLETED"; // Completed

export type EventParticipationFilter = "ALL" | "INDIVIDUAL" | "TEAM";

export const VALID_EVENT_CATEGORIES: readonly EventCategory[] = [
  "TECHNICAL",
  "SPORTS",
  "CULTURAL",
  "ACADEMIC",
  "GAMING",
  "OTHER",
] as const;

export interface EventsFilterState {
  q: string;
  category: string; // "ALL" or specific EventCategory
  status: string; // "ALL", "OPEN", "CLOSED", "COMPLETED"
  type: string; // "ALL", "INDIVIDUAL", "TEAM"
  sort: EventSortOption;
}

export const DEFAULT_EVENTS_FILTER_STATE: EventsFilterState = {
  q: "",
  category: "ALL",
  status: "ALL",
  type: "ALL",
  sort: "soonest",
};

/**
 * Extract unique categories actually present across the public events.
 * Excludes drafts and cancelled events.
 */
export function getAvailableCategories(
  events: EventWithDerivedStatus[]
): EventCategory[] {
  const set = new Set<EventCategory>();
  for (const e of events) {
    if (
      e.item.status !== "DRAFT" &&
      e.item.status !== "CANCELLED" &&
      e.item.category
    ) {
      set.add(e.item.category);
    }
  }
  return Array.from(set);
}

/**
 * Parse and normalize URL search parameters into a clean EventsFilterState.
 * Invalid values are safely ignored and replaced with defaults.
 * Category is strictly validated against EventCategory enum.
 */
export function parseEventsFilterParams(params: {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  type?: string | null;
  sort?: string | null;
}): EventsFilterState {
  const q = (params.q || "").trim();

  // Validate category against EventCategory enum
  const rawCat = (params.category || "").trim().toUpperCase();
  const category = VALID_EVENT_CATEGORIES.includes(rawCat as EventCategory)
    ? rawCat
    : "ALL";

  // Normalize status
  const rawStatus = (params.status || "").trim().toUpperCase();
  let status = "ALL";
  if (
    rawStatus === "OPEN" ||
    rawStatus === "REGISTRATION OPEN" ||
    rawStatus === "CLOSING SOON"
  ) {
    status = "OPEN";
  } else if (
    rawStatus === "CLOSED" ||
    rawStatus === "REGISTRATION CLOSED"
  ) {
    status = "CLOSED";
  } else if (rawStatus === "COMPLETED") {
    status = "COMPLETED";
  }

  // Normalize participation type
  const rawType = (params.type || "").trim().toUpperCase();
  let type = "ALL";
  if (rawType === "INDIVIDUAL" || rawType === "SOLO") {
    type = "INDIVIDUAL";
  } else if (rawType === "TEAM") {
    type = "TEAM";
  }

  // Normalize sort
  let sort: EventSortOption = "soonest";
  const rawSort = (params.sort || "").trim().toLowerCase();
  if (rawSort === "latest" || rawSort === "az") {
    sort = rawSort;
  }

  return { q, category, status, type, sort };
}

/**
 * Serialize an EventsFilterState into a URL query string without empty defaults.
 */
export function serializeEventsFilterParams(state: EventsFilterState): string {
  const sp = new URLSearchParams();
  if (state.q.trim()) sp.set("q", state.q.trim());
  if (state.category && state.category.toUpperCase() !== "ALL") {
    sp.set("category", state.category);
  }
  if (state.status && state.status.toUpperCase() !== "ALL") {
    sp.set("status", state.status.toLowerCase());
  }
  if (state.type && state.type.toUpperCase() !== "ALL") {
    sp.set("type", state.type.toLowerCase());
  }
  if (state.sort && state.sort !== "soonest") {
    sp.set("sort", state.sort);
  }
  return sp.toString();
}

/**
 * Determine if an event has finished/ended.
 * Uses the same rule as getEffectiveStatus/getDerivedStatus:
 * - If status is COMPLETED or resultsPublished is true, it is finished.
 * - Otherwise, endsAt timestamp (or startsAt + 2 hours when endsAt is null).
 * If that end time is strictly before `now`, it is finished.
 */
export function isEventFinished(
  event: EventWithDerivedStatus,
  nowTimestamp: number
): boolean {
  if (
    event.item.status === "COMPLETED" ||
    (event as { resultsPublished?: boolean }).resultsPublished
  ) {
    return true;
  }

  const endMs = event.item.endsAt
    ? new Date(event.item.endsAt).getTime()
    : new Date(event.item.startsAt).getTime() + 2 * 60 * 60 * 1000;

  return endMs < nowTimestamp;
}

/**
 * Filter and sort events in memory.
 * - Matches keyword across title, summary, and venue (case-insensitive, trimmed).
 * - Matches category (exact, or ALL).
 * - Matches derived card status (Open, Closed, Completed).
 * - Matches participation type (Individual/Solo, Team, or ALL).
 * - Drafts and cancelled events are NEVER included.
 * - Default Sort ("soonest" / "Upcoming first"):
 *     Events not finished yet (endsAt, or startsAt + 2h when endsAt is null, is now or later)
 *     come first, ordered by startsAt ascending;
 *     followed by finished events ordered by startsAt descending (most recent first).
 * - "latest": startsAt descending.
 * - "az": title ascending.
 */
export function filterAndSortEvents(
  events: EventWithDerivedStatus[],
  filters: Partial<EventsFilterState>,
  now: number | Date = Date.now()
): EventWithDerivedStatus[] {
  const state: EventsFilterState = {
    ...DEFAULT_EVENTS_FILTER_STATE,
    ...filters,
  };

  const currentNow = typeof now === "number" ? now : new Date(now).getTime();
  const query = state.q.trim().toLowerCase();
  const targetCategory = state.category.trim().toUpperCase();
  const targetStatus = state.status.trim().toUpperCase();
  const targetType = state.type.trim().toUpperCase();

  // 1. Filter
  const filtered = events.filter((e) => {
    // Critical safety: Drafts and cancelled events must never appear on public page
    if (e.item.status === "DRAFT" || e.item.status === "CANCELLED") {
      return false;
    }

    // Keyword match: title, summary, or venue
    if (query) {
      const title = (e.item.title || "").toLowerCase();
      const summary = (e.item.summary || "").toLowerCase();
      const venue = (e.item.venue || "").toLowerCase();
      const matches =
        title.includes(query) ||
        summary.includes(query) ||
        venue.includes(query);
      if (!matches) return false;
    }

    // Category match
    if (targetCategory && targetCategory !== "ALL") {
      if ((e.item.category || "").toUpperCase() !== targetCategory) {
        return false;
      }
    }

    // Derived Status match
    if (targetStatus && targetStatus !== "ALL") {
      const derived = e.derivedStatus;
      if (targetStatus === "OPEN") {
        if (derived !== "Registration Open" && derived !== "Closing Soon") {
          return false;
        }
      } else if (targetStatus === "CLOSED") {
        if (derived !== "Closed") {
          return false;
        }
      } else if (targetStatus === "COMPLETED") {
        if (derived !== "Completed") {
          return false;
        }
      }
    }

    // Participation Type match
    if (targetType && targetType !== "ALL") {
      const type = e.item.participationType;
      if (targetType === "INDIVIDUAL" || targetType === "SOLO") {
        if (type !== "INDIVIDUAL") return false;
      } else if (targetType === "TEAM") {
        if (type !== "TEAM") return false;
      }
    }

    return true;
  });

  // 2. Sort
  return filtered.sort((a, b) => {
    if (state.sort === "latest") {
      return (
        new Date(b.item.startsAt).getTime() - new Date(a.item.startsAt).getTime()
      );
    }
    if (state.sort === "az") {
      return a.item.title.localeCompare(b.item.title, undefined, {
        sensitivity: "base",
      });
    }

    // Default: "soonest" / "Upcoming first"
    const aFinished = isEventFinished(a, currentNow);
    const bFinished = isEventFinished(b, currentNow);

    // Active/upcoming events come before finished events
    if (!aFinished && bFinished) return -1;
    if (aFinished && !bFinished) return 1;

    if (!aFinished && !bFinished) {
      // Both upcoming/active: soonest startsAt first (ascending)
      return (
        new Date(a.item.startsAt).getTime() - new Date(b.item.startsAt).getTime()
      );
    }

    // Both finished: most recently started first (descending startsAt)
    return (
      new Date(b.item.startsAt).getTime() - new Date(a.item.startsAt).getTime()
    );
  });
}
