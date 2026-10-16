"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";
import { isPlaceholderSecretKey } from "./admin.utils";
import { parseCertificateStoragePath } from "@/features/results/certificates.utils";
import {
  resultFormSchema,
  type ResultFormValues,
  validateRankUniqueness,
  validateEventPublishability,
  type ExistingResultItem,
} from "@/features/results/results.rules";

async function revalidateResultsPaths(eventSlug?: string, eventId?: string) {
  revalidatePath("/admin/results");
  if (eventId) {
    revalidatePath(`/admin/results/${eventId}`);
  }
  revalidatePath("/results");
  if (eventSlug) {
    revalidatePath(`/results/${eventSlug}`);
  }
  revalidatePath("/");
}

/**
 * Add a new result to an event.
 */
export async function addResultAction(
  payload: ResultFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = resultFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid result data.",
      };
    }

    const data = parsed.data;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, slug: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    // Fetch existing results for rank uniqueness validation
    const existingRows = await prisma.result.findMany({
      where: { eventId: data.eventId },
      select: {
        id: true,
        position: true,
        isTie: true,
        registrationId: true,
        customParticipantName: true,
        registration: {
          select: {
            user: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
      },
    });

    // Check if the registered participant already has a result
    if (data.participantType === "REGISTERED" && data.registrationId) {
      const alreadyHasResult = existingRows.find(
        (r) => r.registrationId === data.registrationId
      );
      if (alreadyHasResult) {
        return {
          ok: false,
          error: "This participant or team already has a result recorded for this event.",
        };
      }
    }

    // Validate rank uniqueness (ranks 1 to 3 must be unique unless tie is ticked)
    const existingItems: ExistingResultItem[] = existingRows.map((r) => ({
      id: r.id,
      position: r.position,
      isTie: r.isTie,
      registrationId: r.registrationId,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    const rankValidation = validateRankUniqueness(data.position, data.isTie, existingItems);
    if (!rankValidation.valid) {
      return { ok: false, error: rankValidation.error || "Invalid position ranking." };
    }

    const created = await prisma.result.create({
      data: {
        eventId: data.eventId,
        registrationId:
          data.participantType === "REGISTERED" && data.registrationId
            ? data.registrationId
            : null,
        customParticipantName:
          data.participantType === "WALKIN" ? data.customParticipantName : null,
        position: data.position,
        award: data.award,
        score: data.score || null,
        remarks: data.remarks || null,
        isTie: data.isTie,
      },
    });

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("addResultAction error:", err);
    return { ok: false, error: "Failed to record result. Please check inputs and retry." };
  }
}

/**
 * Update an existing result.
 */
export async function updateResultAction(
  resultId: string,
  payload: ResultFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const parsed = resultFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid result data.",
      };
    }

    const data = parsed.data;

    const existingResult = await prisma.result.findUnique({
      where: { id: resultId },
      include: { event: { select: { id: true, slug: true } } },
    });

    if (!existingResult) {
      return { ok: false, error: "Result not found." };
    }

    // Fetch existing results excluding the one being edited
    const otherRows = await prisma.result.findMany({
      where: { eventId: existingResult.eventId, id: { not: resultId } },
      select: {
        id: true,
        position: true,
        isTie: true,
        registrationId: true,
        customParticipantName: true,
        registration: {
          select: {
            user: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
      },
    });

    // Check duplicate participant
    if (data.participantType === "REGISTERED" && data.registrationId) {
      const alreadyHasResult = otherRows.find(
        (r) => r.registrationId === data.registrationId
      );
      if (alreadyHasResult) {
        return {
          ok: false,
          error: "This participant already has another result recorded for this event.",
        };
      }
    }

    const existingItems: ExistingResultItem[] = otherRows.map((r) => ({
      id: r.id,
      position: r.position,
      isTie: r.isTie,
      registrationId: r.registrationId,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    const rankValidation = validateRankUniqueness(
      data.position,
      data.isTie,
      existingItems,
      resultId
    );
    if (!rankValidation.valid) {
      return { ok: false, error: rankValidation.error || "Invalid position ranking." };
    }

    const updated = await prisma.result.update({
      where: { id: resultId },
      data: {
        registrationId:
          data.participantType === "REGISTERED" && data.registrationId
            ? data.registrationId
            : null,
        customParticipantName:
          data.participantType === "WALKIN" ? data.customParticipantName : null,
        position: data.position,
        award: data.award,
        score: data.score || null,
        remarks: data.remarks || null,
        isTie: data.isTie,
      },
    });

    await revalidateResultsPaths(existingResult.event.slug, existingResult.eventId);

    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    console.error("updateResultAction error:", err);
    return { ok: false, error: "Failed to update result." };
  }
}

/**
 * Delete a result row.
 */
export async function deleteResultAction(
  resultId: string,
  eventId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: { event: { select: { id: true, slug: true } } },
    });

    if (!result) {
      return { ok: false, error: "Result not found." };
    }

    if (result.certificateUrl) {
      const storagePath = parseCertificateStoragePath(result.certificateUrl);
      if (storagePath && storagePath.startsWith("certificates/")) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

        if (isPlaceholderSecretKey(serviceRoleKey)) {
          return {
            ok: false,
            error:
              "SUPABASE_SERVICE_ROLE_KEY is not configured or is a placeholder. Please configure a valid secret key for SUPABASE_SERVICE_ROLE_KEY in .env or .env.local.",
          };
        }

        if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
          return {
            ok: false,
            error:
              "NEXT_PUBLIC_SUPABASE_URL is not configured or invalid. Please configure NEXT_PUBLIC_SUPABASE_URL in .env or .env.local.",
          };
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "event-media";
        const { error: removeError } = await supabase.storage.from(bucket).remove([storagePath]);
        if (removeError) {
          return {
            ok: false,
            error: `Failed to remove certificate storage object: ${removeError.message}`,
          };
        }
      }
    }

    await prisma.result.delete({
      where: { id: resultId },
    });

    await revalidateResultsPaths(result.event.slug, eventId);

    return { ok: true, data: { id: resultId } };
  } catch (err) {
    console.error("deleteResultAction error:", err);
    return { ok: false, error: "Failed to delete result." };
  }
}

/**
 * Batch add all approved participants as Participation.
 * Skips anyone already listed in the event's results.
 */
export async function addAllApprovedAsParticipationAction(
  eventId: string
): Promise<ActionResult<{ addedCount: number }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    // Get current results and all approved registrations
    const [existingResults, approvedRegistrations] = await Promise.all([
      prisma.result.findMany({
        where: { eventId },
        select: { registrationId: true, position: true },
      }),
      prisma.registration.findMany({
        where: { eventId, status: "APPROVED" },
        select: { id: true },
      }),
    ]);

    const existingRegIds = new Set(
      existingResults
        .map((r) => r.registrationId)
        .filter((id): id is string => Boolean(id))
    );

    const pendingRegistrations = approvedRegistrations.filter(
      (reg) => !existingRegIds.has(reg.id)
    );

    if (pendingRegistrations.length === 0) {
      return {
        ok: true,
        data: { addedCount: 0 },
      };
    }

    // Determine position: after podium (at least 4)
    const maxPosition = existingResults.reduce((max, r) => Math.max(max, r.position), 3);
    const participationPosition = maxPosition + 1;

    // Create results with award="Participation" and isTie=true
    await prisma.$transaction(
      pendingRegistrations.map((reg) =>
        prisma.result.create({
          data: {
            eventId,
            registrationId: reg.id,
            position: participationPosition,
            award: "Participation",
            isTie: true,
          },
        })
      )
    );

    await revalidateResultsPaths(event.slug, event.id);

    return {
      ok: true,
      data: { addedCount: pendingRegistrations.length },
    };
  } catch (err) {
    console.error("addAllApprovedAsParticipationAction error:", err);
    return { ok: false, error: "Failed to add participation results." };
  }
}

/**
 * Publish results for an event.
 * Publishing is only allowed when event status is 'COMPLETED' and results exist.
 */
export async function publishResultsAction(
  eventId: string
): Promise<ActionResult<{ resultsPublished: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        status: true,
        _count: { select: { results: true } },
      },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    const validation = validateEventPublishability(event.status, event._count.results);
    if (!validation.canPublish) {
      return { ok: false, error: validation.error || "Cannot publish results." };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { resultsPublished: true },
    });

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { resultsPublished: true } };
  } catch (err) {
    console.error("publishResultsAction error:", err);
    return { ok: false, error: "Failed to publish results." };
  }
}

/**
 * Unpublish results for an event.
 */
export async function unpublishResultsAction(
  eventId: string
): Promise<ActionResult<{ resultsPublished: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { resultsPublished: false },
    });

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { resultsPublished: false } };
  } catch (err) {
    console.error("unpublishResultsAction error:", err);
    return { ok: false, error: "Failed to unpublish results." };
  }
}

/**
 * Shortcut helper: Mark an event as COMPLETED.
 */
export async function markEventCompletedAction(
  eventId: string
): Promise<ActionResult<{ status: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
    });

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { status: "COMPLETED" } };
  } catch (err) {
    console.error("markEventCompletedAction error:", err);
    return { ok: false, error: "Failed to update event status to Completed." };
  }
}
