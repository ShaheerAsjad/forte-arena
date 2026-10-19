import { useSyncExternalStore } from "react";

export const SELECTED_EVENT_STORAGE_KEY = "forte-arena:selectedEventId";
export const SELECTED_EVENT_CUSTOM_EVENT = "forte-arena:selectedEventIdChange";

// In-memory fallback for private mode, blocked cookies, or disabled storage
let inMemorySelectedEventId: string | null = null;

/**
 * Safely access window.sessionStorage without throwing.
 */
function safeGetSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Read the persisted selected event ID from sessionStorage (or in-memory fallback).
 * Guaranteed to never throw and returns a primitive string | null.
 */
export function getStoredSelectedEventId(): string | null {
  try {
    const storage = safeGetSessionStorage();
    if (storage) {
      const val = storage.getItem(SELECTED_EVENT_STORAGE_KEY);
      return val ?? inMemorySelectedEventId;
    }
  } catch {
    // Access denied / blocked storage throws
  }
  return inMemorySelectedEventId;
}

/**
 * Persist selected event ID in sessionStorage and broadcast to other components
 * in the same window (e.g. sidebar and mobile nav links). Falls back to in-memory on error.
 */
export function setStoredSelectedEventId(eventId: string): void {
  if (!eventId) return;
  inMemorySelectedEventId = eventId;

  try {
    const storage = safeGetSessionStorage();
    if (storage) {
      storage.setItem(SELECTED_EVENT_STORAGE_KEY, eventId);
    }
  } catch {
    // Ignore storage quota or privacy restrictions
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(SELECTED_EVENT_CUSTOM_EVENT, { detail: eventId })
      );
    } catch {
      // Ignore event dispatch failure
    }
  }
}

/**
 * Clear stored selected event ID from both storage and in-memory fallback.
 */
export function clearStoredSelectedEventId(): void {
  inMemorySelectedEventId = null;
  try {
    const storage = safeGetSessionStorage();
    if (storage) {
      storage.removeItem(SELECTED_EVENT_STORAGE_KEY);
    }
  } catch {
    // Ignore error
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(SELECTED_EVENT_CUSTOM_EVENT, { detail: null })
      );
    } catch {
      // Ignore error
    }
  }
}

export function subscribeToSelectedEventId(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  try {
    window.addEventListener(SELECTED_EVENT_CUSTOM_EVENT, callback);
    window.addEventListener("storage", callback);
  } catch {
    // Ignore listener registration error
  }

  return () => {
    try {
      window.removeEventListener(SELECTED_EVENT_CUSTOM_EVENT, callback);
      window.removeEventListener("storage", callback);
    } catch {
      // Ignore listener removal error
    }
  };
}

export function getServerSnapshotSelectedEventId(): null {
  return null;
}

/**
 * React hook to reactively subscribe to the stored selected event ID
 * across components without causing cascading renders.
 * Crash-proof in private browsing / blocked cookies.
 */
export function useSelectedEventId(): string | null {
  return useSyncExternalStore(
    subscribeToSelectedEventId,
    getStoredSelectedEventId,
    getServerSnapshotSelectedEventId
  );
}

export interface ResolveSelectedEventOptions {
  urlEventId?: string | null;
  storedEventId?: string | null;
  validEventIds: string[];
  defaultEventId?: string | null;
}

/**
 * Determines which event to select in priority order:
 * (a) ?eventId from URL if it matches an event in the valid list
 * (b) stored sessionStorage value if it matches an event in the valid list
 * (c) default fallback (e.g. sortEventsForScanner()[0] / first item)
 */
export function resolveSelectedEventId({
  urlEventId,
  storedEventId,
  validEventIds,
  defaultEventId,
}: ResolveSelectedEventOptions): string {
  if (!validEventIds || validEventIds.length === 0) {
    return "";
  }

  // (a) URL param wins if valid
  if (urlEventId && validEventIds.includes(urlEventId)) {
    return urlEventId;
  }

  // (b) Stored value from sessionStorage if valid
  if (storedEventId && validEventIds.includes(storedEventId)) {
    return storedEventId;
  }

  // (c) Provided default if valid
  if (defaultEventId && validEventIds.includes(defaultEventId)) {
    return defaultEventId;
  }

  // Final fallback: first available event in list
  return validEventIds[0] || "";
}
