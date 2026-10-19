import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveSelectedEventId,
  getStoredSelectedEventId,
  setStoredSelectedEventId,
  clearStoredSelectedEventId,
  getServerSnapshotSelectedEventId,
  subscribeToSelectedEventId,
  SELECTED_EVENT_STORAGE_KEY,
  SELECTED_EVENT_CUSTOM_EVENT,
} from "@/features/attendance/attendance.selection";

describe("Attendance Event Selection Resolution Logic", () => {
  const validIds = ["event-alpha", "event-beta", "event-gamma"];

  it("prioritizes (a) valid ?eventId from URL over sessionStorage and default", () => {
    const selected = resolveSelectedEventId({
      urlEventId: "event-beta",
      storedEventId: "event-gamma",
      validEventIds: validIds,
      defaultEventId: "event-alpha",
    });

    expect(selected).toBe("event-beta");
  });

  it("falls back to (b) stored sessionStorage value if URL param is invalid or missing", () => {
    // Case 1: URL param is for an event not in the list
    const selectedInvalidUrl = resolveSelectedEventId({
      urlEventId: "non-existent-event",
      storedEventId: "event-gamma",
      validEventIds: validIds,
      defaultEventId: "event-alpha",
    });
    expect(selectedInvalidUrl).toBe("event-gamma");

    // Case 2: URL param is null / empty
    const selectedNoUrl = resolveSelectedEventId({
      urlEventId: null,
      storedEventId: "event-gamma",
      validEventIds: validIds,
      defaultEventId: "event-alpha",
    });
    expect(selectedNoUrl).toBe("event-gamma");
  });

  it("falls back to (c) default event if neither URL param nor stored value is valid", () => {
    // URL invalid, stored invalid -> default wins
    const selected = resolveSelectedEventId({
      urlEventId: "invalid-url",
      storedEventId: "invalid-stored",
      validEventIds: validIds,
      defaultEventId: "event-beta",
    });

    expect(selected).toBe("event-beta");
  });

  it("falls back to validEventIds[0] if default is also invalid or absent", () => {
    const selected = resolveSelectedEventId({
      urlEventId: null,
      storedEventId: null,
      validEventIds: validIds,
      defaultEventId: "not-in-list",
    });

    expect(selected).toBe("event-alpha");
  });

  it("returns empty string if validEventIds is empty", () => {
    const selected = resolveSelectedEventId({
      urlEventId: "event-alpha",
      storedEventId: "event-alpha",
      validEventIds: [],
      defaultEventId: "event-alpha",
    });

    expect(selected).toBe("");
  });
});

describe("Attendance Selection Storage Helpers", () => {
  let mockStorage: Record<string, string> = {};
  const listeners: Record<string, Array<(e: unknown) => void>> = {};

  beforeEach(() => {
    mockStorage = {};
    listeners[SELECTED_EVENT_CUSTOM_EVENT] = [];
    clearStoredSelectedEventId();

    // Provide lightweight window mock in Node test environment
    const mockWindow = {
      sessionStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        clear: () => {
          mockStorage = {};
        },
      },
      dispatchEvent: (event: CustomEvent) => {
        listeners[event.type]?.forEach((cb) => cb(event));
        return true;
      },
      addEventListener: (type: string, cb: (e: unknown) => void) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(cb);
      },
      removeEventListener: (type: string, cb: (e: unknown) => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((fn) => fn !== cb);
        }
      },
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, params?: { detail?: unknown }) {
          this.type = type;
          this.detail = params?.detail;
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads and writes the stored event ID in sessionStorage", () => {
    expect(getStoredSelectedEventId()).toBeNull();

    setStoredSelectedEventId("event-beta");
    expect(mockStorage[SELECTED_EVENT_STORAGE_KEY]).toBe("event-beta");
    expect(getStoredSelectedEventId()).toBe("event-beta");
  });

  it("dispatches custom event on setStoredSelectedEventId", () => {
    const listener = vi.fn();
    window.addEventListener(SELECTED_EVENT_CUSTOM_EVENT, listener);

    setStoredSelectedEventId("event-gamma");

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toBe("event-gamma");

    window.removeEventListener(SELECTED_EVENT_CUSTOM_EVENT, listener);
  });

  it("falls back to in-memory variable without throwing when window.sessionStorage property access throws", () => {
    // Simulate private mode / cookies disabled where accessing window.sessionStorage throws SecurityError
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("SecurityError: Failed to read the 'sessionStorage' property from 'Window'");
      },
      configurable: true,
    });

    // None of these should throw
    expect(() => getStoredSelectedEventId()).not.toThrow();
    expect(getStoredSelectedEventId()).toBeNull();

    expect(() => setStoredSelectedEventId("event-private-mode")).not.toThrow();
    // Memory fallback captures it and returns it seamlessly
    expect(getStoredSelectedEventId()).toBe("event-private-mode");

    expect(() => clearStoredSelectedEventId()).not.toThrow();
    expect(getStoredSelectedEventId()).toBeNull();
  });

  it("falls back to in-memory variable without throwing when getItem or setItem throws", () => {
    // Simulate sessionStorage methods throwing (quota exceeded, blocked access)
    const throwingStorage = {
      getItem: () => {
        throw new DOMException("QuotaExceededError");
      },
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("QuotaExceededError");
      },
      clear: () => {},
    };

    Object.defineProperty(window, "sessionStorage", {
      value: throwingStorage,
      configurable: true,
      writable: true,
    });

    expect(() => getStoredSelectedEventId()).not.toThrow();
    expect(() => setStoredSelectedEventId("event-quota-safe")).not.toThrow();
    expect(getStoredSelectedEventId()).toBe("event-quota-safe");

    expect(() => clearStoredSelectedEventId()).not.toThrow();
    expect(getStoredSelectedEventId()).toBeNull();
  });

  it("satisfies useSyncExternalStore contracts: getServerSnapshot returns null, getSnapshot returns primitive string | null", () => {
    // 1. Server snapshot must always be null
    expect(getServerSnapshotSelectedEventId()).toBeNull();

    // 2. Client snapshot must be a primitive string | null
    const initial = getStoredSelectedEventId();
    expect(initial === null || typeof initial === "string").toBe(true);

    setStoredSelectedEventId("event-reactive");
    const updated = getStoredSelectedEventId();
    expect(updated).toBe("event-reactive");
  });

  it("subscribeToSelectedEventId notifies subscribers on event change and cleans up all listeners", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToSelectedEventId(callback);

    setStoredSelectedEventId("event-sub-1");
    expect(callback).toHaveBeenCalledTimes(1);

    // Call cleanup function
    unsubscribe();

    // After unsubscribe, further updates should NOT trigger the callback
    setStoredSelectedEventId("event-sub-2");
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
