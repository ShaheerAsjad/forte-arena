"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { eventFormSchema, type EventFormValues } from "./events.schemas";
import { generateUniqueSlug } from "./admin.utils";
import type { ActionResult } from "@/lib/action-result";

/**
 * Server action to create a new event.
 */
export async function createEventAction(
  payload: EventFormValues
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = eventFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid event data",
      };
    }

    const data = parsed.data;

    // Check slug uniqueness and generate unique slug if taken
    const uniqueSlug = await generateUniqueSlug(
      data.slug || data.title,
      async (candidateSlug) => {
        const existing = await prisma.event.findUnique({
          where: { slug: candidateSlug },
          select: { id: true },
        });
        return Boolean(existing);
      }
    );

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        summary: data.summary,
        description: data.description,
        category: data.category,
        rules: data.rules,
        eligibility: data.eligibility,
        prizes: data.prizes,
        venue: data.venue,
        status: data.status,
        participationType: data.participationType,
        minTeamSize:
          data.participationType === "TEAM" ? Math.max(1, data.minTeamSize) : 1,
        maxTeamSize:
          data.participationType === "TEAM" ? Math.max(1, data.maxTeamSize) : 1,
        maxParticipants: data.maxParticipants ?? null,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        registrationDeadline: new Date(data.registrationDeadline),
        posterUrl: data.posterUrl?.trim() || null,
        createdById: user.id,
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/admin/events");
    revalidatePath("/admin");
    revalidatePath("/events");
    revalidatePath("/");

    return { ok: true, data: { id: event.id, slug: event.slug } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create event.";
    return { ok: false, error: message };
  }
}

/**
 * Server action to update an existing event.
 */
export async function updateEventAction(
  eventId: string,
  payload: EventFormValues
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = eventFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid event data",
      };
    }

    const data = parsed.data;

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true },
    });

    if (!existingEvent) {
      return { ok: false, error: "Event not found." };
    }

    // Ensure slug remains unique if changed
    const uniqueSlug = await generateUniqueSlug(
      data.slug || data.title,
      async (candidateSlug) => {
        const found = await prisma.event.findUnique({
          where: { slug: candidateSlug },
          select: { id: true },
        });
        return Boolean(found && found.id !== eventId);
      },
      existingEvent.slug
    );

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        slug: uniqueSlug,
        summary: data.summary,
        description: data.description,
        category: data.category,
        rules: data.rules,
        eligibility: data.eligibility,
        prizes: data.prizes,
        venue: data.venue,
        status: data.status,
        participationType: data.participationType,
        minTeamSize:
          data.participationType === "TEAM" ? Math.max(1, data.minTeamSize) : 1,
        maxTeamSize:
          data.participationType === "TEAM" ? Math.max(1, data.maxTeamSize) : 1,
        maxParticipants: data.maxParticipants ?? null,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        registrationDeadline: new Date(data.registrationDeadline),
        posterUrl: data.posterUrl?.trim() || null,
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}/edit`);
    revalidatePath(`/admin/events/${eventId}/registrations`);
    revalidatePath(`/events/${updated.slug}`);
    revalidatePath(`/events/${existingEvent.slug}`);
    revalidatePath("/events");
    revalidatePath("/admin");
    revalidatePath("/");

    return { ok: true, data: { id: updated.id, slug: updated.slug } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update event.";
    return { ok: false, error: message };
  }
}

/**
 * Server action to delete an event.
 * Delete ONLY allowed if event has no registrations, otherwise must cancel/archive.
 */
export async function deleteEventAction(
  eventId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const registrationCount = await prisma.registration.count({
      where: { eventId },
    });

    if (registrationCount > 0) {
      return {
        ok: false,
        error:
          "Cannot delete an event that already has registrations. Please cancel or archive the event instead to preserve participant records.",
      };
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath("/admin/events");
    revalidatePath("/admin");
    revalidatePath("/events");
    revalidatePath("/");

    return { ok: true, data: { success: true } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete event.";
    return { ok: false, error: message };
  }
}

/**
 * Server action to cancel/archive an event.
 */
export async function cancelEventAction(
  eventId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
      select: { slug: true },
    });

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}/edit`);
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/events");
    revalidatePath("/admin");
    revalidatePath("/");

    return { ok: true, data: { success: true } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel event.";
    return { ok: false, error: message };
  }
}

/**
 * Server action to mark an event as COMPLETED.
 */
export async function markEventCompletedAction(
  eventId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
      select: { id: true, slug: true },
    });

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}/edit`);
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/events");
    revalidatePath("/admin");
    revalidatePath("/results");
    revalidatePath("/");

    return { ok: true, data: { success: true } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark event as completed.";
    return { ok: false, error: message };
  }
}
