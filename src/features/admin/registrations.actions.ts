"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

/**
 * Server action to approve a participant registration.
 * Re-checks event participant capacity inside a database transaction to prevent over-subscription.
 */
export async function approveRegistrationAction(
  registrationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const updated = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              maxParticipants: true,
            },
          },
        },
      });

      if (!reg) {
        throw new AppError("Registration not found.", "NOT_FOUND", 404);
      }

      // If already approved, return without error
      if (reg.status === "APPROVED") {
        return reg;
      }

      // Re-check capacity inside transaction
      if (reg.event.maxParticipants !== null) {
        const currentApproved = await tx.registration.count({
          where: {
            eventId: reg.eventId,
            status: "APPROVED",
          },
        });

        if (currentApproved >= reg.event.maxParticipants) {
          throw new AppError(
            `Event capacity reached (${reg.event.maxParticipants} max participants). Cannot approve additional registrations.`,
            "EVENT_FULL",
            400
          );
        }
      }

      return tx.registration.update({
        where: { id: registrationId },
        data: {
          status: "APPROVED",
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      });
    });

    revalidatePath(`/admin/events/${updated.event.id}/registrations`);
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
