"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";
import {
  announcementFormSchema,
  type AnnouncementFormValues,
} from "@/features/announcements/announcements.rules";

async function revalidateAnnouncementPaths(eventSlug?: string | null) {
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidatePath("/announcements");
  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
  }
}

/**
 * Creates a new announcement.
 */
export async function createAnnouncementAction(
  payload: AnnouncementFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = announcementFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid announcement details.",
      };
    }

    const data = parsed.data;

    let eventSlug: string | null = null;
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
        select: { id: true, slug: true },
      });
      if (event) {
        eventSlug = event.slug;
      }
    }

    const created = await prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        pinned: data.pinned,
        isVisible: data.isVisible,
        eventId: data.eventId || null,
        linkUrl: data.linkUrl || null,
        linkLabel: data.linkLabel || null,
        createdById: session.id,
      },
    });

    await revalidateAnnouncementPaths(eventSlug);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createAnnouncementAction error:", err);
    return { ok: false, error: "Failed to publish announcement. Please retry." };
  }
}

/**
 * Updates an existing announcement.
 */
export async function updateAnnouncementAction(
  id: string,
  payload: AnnouncementFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = announcementFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid announcement details.",
      };
    }

    const data = parsed.data;

    const existing = await prisma.announcement.findUnique({
      where: { id },
      include: { event: { select: { slug: true } } },
    });

    if (!existing) {
      return { ok: false, error: "Announcement not found." };
    }

    let targetEventSlug = existing.event?.slug ?? null;
    if (data.eventId && data.eventId !== existing.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
        select: { slug: true },
      });
      if (event) targetEventSlug = event.slug;
    }

    await prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        pinned: data.pinned,
        isVisible: data.isVisible,
        eventId: data.eventId || null,
        linkUrl: data.linkUrl || null,
        linkLabel: data.linkLabel || null,
      },
    });

    await revalidateAnnouncementPaths(targetEventSlug);

    return { ok: true, data: { id } };
  } catch (err) {
    console.error("updateAnnouncementAction error:", err);
    return { ok: false, error: "Failed to update announcement." };
  }
}

/**
 * Toggles pinned status for an announcement.
 */
export async function togglePinnedAnnouncementAction(
  id: string,
  pinned: boolean
): Promise<ActionResult<{ pinned: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const updated = await prisma.announcement.update({
      where: { id },
      data: { pinned },
      include: { event: { select: { slug: true } } },
    });

    await revalidateAnnouncementPaths(updated.event?.slug);

    return { ok: true, data: { pinned: updated.pinned } };
  } catch (err) {
    console.error("togglePinnedAnnouncementAction error:", err);
    return { ok: false, error: "Failed to update pinned state." };
  }
}

/**
 * Toggles visibility for an announcement (show/hide).
 */
export async function toggleVisibleAnnouncementAction(
  id: string,
  isVisible: boolean
): Promise<ActionResult<{ isVisible: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const updated = await prisma.announcement.update({
      where: { id },
      data: { isVisible },
      include: { event: { select: { slug: true } } },
    });

    await revalidateAnnouncementPaths(updated.event?.slug);

    return { ok: true, data: { isVisible: updated.isVisible } };
  } catch (err) {
    console.error("toggleVisibleAnnouncementAction error:", err);
    return { ok: false, error: "Failed to update visibility." };
  }
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncementAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const deleted = await prisma.announcement.delete({
      where: { id },
      include: { event: { select: { slug: true } } },
    });

    await revalidateAnnouncementPaths(deleted.event?.slug);

    return { ok: true, data: { id } };
  } catch (err) {
    console.error("deleteAnnouncementAction error:", err);
    return { ok: false, error: "Failed to delete announcement." };
  }
}
