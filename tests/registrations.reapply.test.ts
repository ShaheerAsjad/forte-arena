import { describe, it, expect } from "vitest";
import {
  isActiveRegistration,
  assertCanRegister,
  parseRegistrationAttempts,
} from "@/features/registrations/registrations.rules";
import { ConflictError, AppError } from "@/lib/errors";

describe("Withdrawal & Re-Application Rules", () => {
  describe("isActiveRegistration", () => {
    it("returns true for active statuses PENDING, APPROVED, REJECTED", () => {
      expect(isActiveRegistration("PENDING")).toBe(true);
      expect(isActiveRegistration("APPROVED")).toBe(true);
      expect(isActiveRegistration("REJECTED")).toBe(true);
    });

    it("returns false for WITHDRAWN status", () => {
      expect(isActiveRegistration("WITHDRAWN")).toBe(false);
    });
  });

  describe("parseRegistrationAttempts", () => {
    it("defaults to 1 when notes is null, undefined, or missing attempt count", () => {
      expect(parseRegistrationAttempts(null)).toBe(1);
      expect(parseRegistrationAttempts(undefined)).toBe(1);
      expect(parseRegistrationAttempts("")).toBe(1);
      expect(parseRegistrationAttempts("regular user notes")).toBe(1);
    });

    it("parses attempt count correctly from formatted notes", () => {
      expect(parseRegistrationAttempts("attempt:1")).toBe(1);
      expect(parseRegistrationAttempts("attempt:2|withdrawn:1")).toBe(2);
      expect(parseRegistrationAttempts("attempt:2|withdrawn:2")).toBe(2);
    });

    it("reads attempt count directly from object with attemptCount column", () => {
      expect(parseRegistrationAttempts({ attemptCount: 1 })).toBe(1);
      expect(parseRegistrationAttempts({ attemptCount: 2 })).toBe(2);
      expect(parseRegistrationAttempts({ attemptCount: null, notes: "attempt:2" })).toBe(2);
    });
  });

  describe("assertCanRegister", () => {
    it("allows registration when user has no existing record", () => {
      expect(() => assertCanRegister(null)).not.toThrow();
    });

    it("blocks registration when user has an active PENDING registration", () => {
      expect(() =>
        assertCanRegister({ status: "PENDING", attemptCount: 1, withdrawCount: 0 })
      ).toThrow(ConflictError);
      expect(() =>
        assertCanRegister({ status: "PENDING", notes: "attempt:1" })
      ).toThrow("already have an active registration");
    });

    it("blocks registration when user has an active APPROVED registration", () => {
      expect(() =>
        assertCanRegister({ status: "APPROVED", attemptCount: 1, withdrawCount: 0 })
      ).toThrow(ConflictError);
    });

    it("blocks registration when user has a REJECTED registration", () => {
      expect(() =>
        assertCanRegister({ status: "REJECTED", attemptCount: 1, withdrawCount: 0 })
      ).toThrow(ConflictError);
    });

    it("allows re-registering when user has a WITHDRAWN registration from attempt 1", () => {
      // Using new attemptCount and withdrawCount columns
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", attemptCount: 1, withdrawCount: 1 })
      ).not.toThrow();
      // Using legacy notes
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:1|withdrawn:1" })
      ).not.toThrow();
    });

    it("blocks re-registering when user has reached 2 total attempts and withdrew twice", () => {
      // Using new attemptCount and withdrawCount columns
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", attemptCount: 2, withdrawCount: 2 })
      ).toThrow(AppError);
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", attemptCount: 2, withdrawCount: 2 })
      ).toThrow("maximum limit of 2 registration attempts");

      // Using legacy notes
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:2|withdrawn:2" })
      ).toThrow(AppError);
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:2|withdrawn:2" })
      ).toThrow("maximum limit of 2 registration attempts");
    });
  });
});
