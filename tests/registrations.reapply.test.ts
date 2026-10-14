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
  });

  describe("assertCanRegister", () => {
    it("allows registration when user has no existing record", () => {
      expect(() => assertCanRegister(null)).not.toThrow();
    });

    it("blocks registration when user has an active PENDING registration", () => {
      expect(() =>
        assertCanRegister({ status: "PENDING", notes: "attempt:1" })
      ).toThrow(ConflictError);
      expect(() =>
        assertCanRegister({ status: "PENDING", notes: "attempt:1" })
      ).toThrow("already have an active registration");
    });

    it("blocks registration when user has an active APPROVED registration", () => {
      expect(() =>
        assertCanRegister({ status: "APPROVED", notes: "attempt:1" })
      ).toThrow(ConflictError);
    });

    it("blocks registration when user has a REJECTED registration", () => {
      expect(() =>
        assertCanRegister({ status: "REJECTED", notes: "attempt:1" })
      ).toThrow(ConflictError);
    });

    it("allows re-registering when user has a WITHDRAWN registration from attempt 1", () => {
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:1|withdrawn:1" })
      ).not.toThrow();
    });

    it("blocks re-registering when user has reached 2 total attempts and withdrew twice", () => {
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:2|withdrawn:2" })
      ).toThrow(AppError);
      expect(() =>
        assertCanRegister({ status: "WITHDRAWN", notes: "attempt:2|withdrawn:2" })
      ).toThrow("maximum limit of 2 registration attempts");
    });
  });
});
