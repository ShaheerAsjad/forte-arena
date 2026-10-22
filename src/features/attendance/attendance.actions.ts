"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import {
  scanCheckInSchema,
  manualCheckInSchema,
  undoCheckInSchema,
  type ScanCheckInInput,
  type ManualCheckInInput,
  type UndoCheckInInput,
} from "./attendance.schemas";
import {
  AttendanceService,
  type CheckInResult,
} from "./services/attendance.service";

/**
 * Server action to process in-browser QR scan check-in.
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
      revalidatePath("/admin/attendance");
      revalidatePath("/admin/registrations");
      revalidatePath(`/admin/events/${eventId}/registrations`);
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/pass/[registrationId]", "page");
      revalidatePath("/dashboard/[registrationId]", "page");
      if (result.registration?.id) {
        revalidatePath(`/dashboard/pass/${result.registration.id}`);
        revalidatePath(`/dashboard/${result.registration.id}`);
      }
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
 * Server action to process manual check-in for solo attendee or team member.
 */
export async function manualCheckInAction(
  rawInput: ManualCheckInInput
): Promise<ActionResult<CheckInResult>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = manualCheckInSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid manual check-in data",
      };
    }

    const { participantId, participantType, eventId } = parsed.data;

    const result = await AttendanceService.checkInManually({
      participantId,
      participantType,
      eventId,
      organizerId: user.id,
    });

    if (result.success && !result.alreadyCheckedIn) {
      revalidatePath("/admin/scan");
      revalidatePath("/admin/attendance");
      revalidatePath("/admin/registrations");
      revalidatePath(`/admin/events/${eventId}/registrations`);
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/pass/[registrationId]", "page");
      revalidatePath("/dashboard/[registrationId]", "page");
      if (result.registration?.id) {
        revalidatePath(`/dashboard/pass/${result.registration.id}`);
        revalidatePath(`/dashboard/${result.registration.id}`);
      }
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
 * Server action to search approved participants for manual entry fallback.
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
 * Server action to undo an accidental check-in (supports both solo attendee and team member).
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
        error: parsed.error.issues[0]?.message || "Invalid participant ID",
      };
    }

    const updated = await AttendanceService.undoCheckIn(parsed.data);

    revalidatePath("/admin/scan");
    revalidatePath("/admin/attendance");
    revalidatePath("/admin/registrations");
    revalidatePath(`/admin/events/${updated.eventId}/registrations`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pass/[registrationId]", "page");
    revalidatePath("/dashboard/[registrationId]", "page");

    const regId =
      "registrationId" in updated && updated.registrationId
        ? (updated.registrationId as string)
        : updated.id;
    if (regId) {
      revalidatePath(`/dashboard/pass/${regId}`);
      revalidatePath(`/dashboard/${regId}`);
    }

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
 * Server action to get lightweight attendance counts (totalApproved and totalAttended) for the scan gate.
 */
export async function getEventAttendanceCountsAction(
  eventId: string
): Promise<ActionResult<Awaited<ReturnType<typeof AttendanceService.getEventAttendanceCounts>>>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    if (!eventId) {
      return { ok: false, error: "Event ID is required" };
    }

    const counts = await AttendanceService.getEventAttendanceCounts(eventId);
    return { ok: true, data: counts };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to fetch event attendance counts";
    return { ok: false, error: message };
  }
}

/**
 * Server action to get detailed attendance stats for the Attendance page.
 */
export async function getEventDetailedStatsAction(
  eventId: string
): Promise<ActionResult<Awaited<ReturnType<typeof AttendanceService.getEventDetailedStats>>>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    if (!eventId) {
      return { ok: false, error: "Event ID is required" };
    }

    const stats = await AttendanceService.getEventDetailedStats(eventId);
    return { ok: true, data: stats };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to fetch event detailed stats";
    return { ok: false, error: message };
  }
}

/**
 * Server action to get all approved participants for the Attendance page.
 */
export async function getEventAttendanceParticipantsAction(
  eventId: string
): Promise<ActionResult<Awaited<ReturnType<typeof AttendanceService.getEventAttendanceParticipants>>>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    if (!eventId) {
      return { ok: false, error: "Event ID is required" };
    }

    const participants = await AttendanceService.getEventAttendanceParticipants(eventId);
    return { ok: true, data: participants };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to fetch attendance participants";
    return { ok: false, error: message };
  }
}

