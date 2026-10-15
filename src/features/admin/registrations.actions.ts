"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { AdminRepository } from "./admin.repository";

/**
 * Server action to approve a participant registration.
 * Re-checks event participant capacity inside a database transaction with PostgreSQL row-level lock (FOR UPDATE).
 */
export async function approveRegistrationAction(
  registrationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const updated = await AdminRepository.approveRegistrationWithLock(
      registrationId,
      user.id
    );

    revalidatePath(`/admin/events/${updated.event.id}/registrations`);
    revalidatePath("/admin/registrations");
    revalidatePath(`/events/${updated.event.slug}`);
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Failed to approve registration.";
    return { ok: false, error: message };
  }
}

/**
 * Server action to reject a participant registration.
 * The reject reason is stored in the `notes` (and `rejectionReason`) field.
 */
export async function rejectRegistrationAction(
  registrationId: string,
  reason: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      return {
        ok: false,
        error: "Please provide a rejection reason with at least 3 characters.",
      };
    }

    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (!reg) {
      return { ok: false, error: "Registration not found." };
    }

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: "REJECTED",
        notes: trimmedReason,
        rejectionReason: trimmedReason,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath(`/admin/events/${reg.event.id}/registrations`);
    revalidatePath("/admin/registrations");
    revalidatePath(`/events/${reg.event.slug}`);
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: reg.id } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reject registration.";
    return { ok: false, error: message };
  }
}
