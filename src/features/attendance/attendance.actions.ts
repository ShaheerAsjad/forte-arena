"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import {
  scanCheckInSchema,
  undoCheckInSchema,
  type ScanCheckInInput,
  type UndoCheckInInput,
} from "./attendance.schemas";
import {
  AttendanceService,
  type CheckInResult,
} from "./services/attendance.service";

/**
 * Server action to process in-browser QR scan check-in.
 * Enforces ORGANIZER / ADMIN authorization, validates input with Zod,
 * verifies event and status, and performs idempotent check-in.
 */
export async function scanCheckInAction(
  rawInput: ScanCheckInInput
): Promise<ActionResult<CheckInResult>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = scanCheckInSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid input data",
      };
    }

    const { token, eventId } = parsed.data;

    const result = await AttendanceService.checkInByToken({
      token,
      eventId,
      organizerId: user.id,
    });

    if (result.success && !result.alreadyCheckedIn) {
      revalidatePath("/admin/scan");
      revalidatePath("/admin/registrations");
      revalidatePath(`/admin/events/${eventId}/registrations`);
    }

    return { ok: true, data: result };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to process check-in scan";
    return { ok: false, error: message };
  }
}

/**
 * Server action to process manual check-in by registration ID.
 */
export async function manualCheckInAction(input: {
  registrationId: string;
  eventId: string;
}): Promise<ActionResult<CheckInResult>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    if (!input.registrationId || !input.eventId) {
      return { ok: false, error: "Registration ID and Event ID are required" };
    }

    const result = await AttendanceService.checkInByRegistrationId({
      registrationId: input.registrationId,
      eventId: input.eventId,
      organizerId: user.id,
    });

    if (result.success && !result.alreadyCheckedIn) {
      revalidatePath("/admin/scan");
      revalidatePath("/admin/registrations");
      revalidatePath(`/admin/events/${input.eventId}/registrations`);
    }

    return { ok: true, data: result };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to process manual check-in";
    return { ok: false, error: message };
  }
}

/**
 * Server action to search approved registrations for manual entry fallback.
 */
export async function searchManualRegistrationsAction(
  eventId: string,
  query: string
): Promise<ActionResult<Awaited<ReturnType<typeof AttendanceService.searchRegistrations>>>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    if (!eventId || !query.trim()) {
      return { ok: true, data: [] };
    }

    const results = await AttendanceService.searchRegistrations(eventId, query);
    return { ok: true, data: results };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to search registrations";
    return { ok: false, error: message };
  }
}

/**
 * Server action to undo an accidental check-in.
 */
export async function undoCheckInAction(
  rawInput: UndoCheckInInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = undoCheckInSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid registration ID",
      };
    }

    const updated = await AttendanceService.undoCheckIn(parsed.data.registrationId);

    revalidatePath("/admin/scan");
    revalidatePath("/admin/registrations");
    revalidatePath(`/admin/events/${updated.eventId}/registrations`);

    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to undo check-in";
    return { ok: false, error: message };
  }
}

/**
 * Server action to get live stats and recent check-ins for an event.
 */
export async function getEventAttendanceStatsAction(
  eventId: string
): Promise<ActionResult<Awaited<ReturnType<typeof AttendanceService.getEventStats>>>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    if (!eventId) {
      return { ok: false, error: "Event ID is required" };
    }

    const stats = await AttendanceService.getEventStats(eventId);
    return { ok: true, data: stats };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to fetch event attendance stats";
    return { ok: false, error: message };
  }
}
