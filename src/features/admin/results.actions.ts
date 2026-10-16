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
  validateParticipantUniqueness,
  validateAwardForPosition,
  validateQuickPodiumPayload,
  validateBatchAwardPayload,
  validateEventPublishability,
  type QuickPodiumPayload,
  type ExistingResultItem,
  getAutomaticAwardForPosition,
  planPodiumSwap,
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

function mapPrismaError(err: unknown, defaultMessage: string): string {
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
    const meta = (err as { meta?: { target?: string[] | string } }).meta;
    const targetStr = String(meta?.target || "");
    if (targetStr.includes("position") || targetStr.includes("podium")) {
      return "1st, 2nd, and 3rd Places are unique per event. This podium position is already taken.";
    }
    if (targetStr.includes("registrationId")) {
      return "This participant already has a result recorded for this event.";
    }
    return "A unique constraint conflict occurred. Please verify rankings and participants.";
  }
  return err instanceof Error ? err.message : defaultMessage;
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

    // Fetch existing results for rank and participant uniqueness validation
    const existingRows = await prisma.result.findMany({
      where: { eventId: data.eventId },
      select: {
        id: true,
        position: true,
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

    const existingItems: ExistingResultItem[] = existingRows.map((r) => ({
      id: r.id,
      position: r.position,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    // 1. One result per participant
    const participantValidation = validateParticipantUniqueness(
      data.participantType,
      data.registrationId,
      data.customParticipantName,
      existingItems
    );
    if (!participantValidation.valid) {
      return { ok: false, error: participantValidation.error || "Duplicate participant." };
    }

    // 2. Positions 1, 2, and 3 are unique per event (no exceptions)
    const rankValidation = validateRankUniqueness(data.position, existingItems);
    if (!rankValidation.valid) {
      return { ok: false, error: rankValidation.error || "Invalid position ranking." };
    }

    // 3. Award title: automatic for 1..3, flexible for 4+
    const finalAward = getAutomaticAwardForPosition(data.position) || data.award.trim();
    const awardValidation = validateAwardForPosition(data.position, finalAward);
    if (!awardValidation.valid) {
      return { ok: false, error: awardValidation.error || "Invalid award label." };
    }

    const created = await prisma.result.create({
      data: {
        eventId: data.eventId,
        registrationId:
          data.participantType === "REGISTERED" && data.registrationId
            ? data.registrationId
            : null,
        customParticipantName:
          data.participantType === "WALKIN" && data.customParticipantName
            ? data.customParticipantName.trim()
            : null,
        position: data.position,
        award: finalAward,
        score: data.score ? data.score.trim() : null,
        remarks: data.remarks ? data.remarks.trim() : null,
        isTie: false,
      },
    });

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("addResultAction error:", err);
    return { ok: false, error: mapPrismaError(err, "Failed to record result. Please check inputs and retry.") };
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

    // Fetch existing results for this event
    const otherRows = await prisma.result.findMany({
      where: { eventId: existingResult.eventId },
      select: {
        id: true,
        position: true,
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

    const existingItems: ExistingResultItem[] = otherRows.map((r) => ({
      id: r.id,
      position: r.position,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    // 1. Participant uniqueness check
    const participantValidation = validateParticipantUniqueness(
      data.participantType,
      data.registrationId,
      data.customParticipantName,
      existingItems,
      resultId
    );
    if (!participantValidation.valid) {
      return { ok: false, error: participantValidation.error || "Duplicate participant." };
    }

    // 2. Rank uniqueness check
    const rankValidation = validateRankUniqueness(
      data.position,
      existingItems,
      resultId
    );
    if (!rankValidation.valid) {
      return { ok: false, error: rankValidation.error || "Invalid position ranking." };
    }

    // 3. Award title validation
    const finalAward = getAutomaticAwardForPosition(data.position) || data.award.trim();
    const awardValidation = validateAwardForPosition(data.position, finalAward);
    if (!awardValidation.valid) {
      return { ok: false, error: awardValidation.error || "Invalid award label." };
    }

    const updated = await prisma.result.update({
      where: { id: resultId },
      data: {
        registrationId:
          data.participantType === "REGISTERED" && data.registrationId
            ? data.registrationId
            : null,
        customParticipantName:
          data.participantType === "WALKIN" && data.customParticipantName
            ? data.customParticipantName.trim()
            : null,
        position: data.position,
        award: finalAward,
        score: data.score ? data.score.trim() : null,
        remarks: data.remarks ? data.remarks.trim() : null,
        isTie: false,
      },
    });

    await revalidateResultsPaths(existingResult.event.slug, existingResult.eventId);

    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    console.error("updateResultAction error:", err);
    return { ok: false, error: mapPrismaError(err, "Failed to update result.") };
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
 * Quick Podium form:
 * Sets 1st, 2nd, and/or 3rd places in ONE transaction.
 * Rejects duplicate participants across slots; any slot may stay empty.
 */
export async function addQuickPodiumAction(
  payload: QuickPodiumPayload
): Promise<ActionResult<{ savedCount: number }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const event = await prisma.event.findUnique({
      where: { id: payload.eventId },
      select: { id: true, slug: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    // Fetch existing results for this event
    const existingRows = await prisma.result.findMany({
      where: { eventId: payload.eventId },
      select: {
        id: true,
        position: true,
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

    const existingItems: ExistingResultItem[] = existingRows.map((r) => ({
      id: r.id,
      position: r.position,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    const validation = validateQuickPodiumPayload(payload, existingItems);
    if (!validation.valid) {
      return { ok: false, error: validation.error || "Invalid podium selection." };
    }

    const slotsToInsert = [
      { pos: 1, award: "Champion", slot: payload.first },
      { pos: 2, award: "Runner-up", slot: payload.second },
      { pos: 3, award: "Second Runner-up", slot: payload.third },
    ].filter((item) => Boolean(item.slot));

    // Save all chosen podium slots in ONE transaction
    await prisma.$transaction(
      slotsToInsert.map((item) =>
        prisma.result.create({
          data: {
            eventId: payload.eventId,
            position: item.pos,
            award: item.award,
            registrationId:
              item.slot?.participantType === "REGISTERED" && item.slot.registrationId
                ? item.slot.registrationId
                : null,
            customParticipantName:
              item.slot?.participantType === "WALKIN" && item.slot.customParticipantName
                ? item.slot.customParticipantName.trim()
                : null,
            isTie: false,
          },
        })
      )
    );

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { savedCount: slotsToInsert.length } };
  } catch (err) {
    console.error("addQuickPodiumAction error:", err);
    return { ok: false, error: mapPrismaError(err, "Failed to record quick podium standings.") };
  }
}

/**
 * Add several participants with the same award:
 * The organizer manually ticks several approved participants and gives them
 * one award (Honorable Mention or Participation), saved in one transaction.
 */
export async function addBatchAwardAction(
  eventId: string,
  registrationIds: string[],
  award: "Honorable Mention" | "Participation",
  startingPosition?: number
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

    // Get current results
    const existingRows = await prisma.result.findMany({
      where: { eventId },
      select: {
        id: true,
        position: true,
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

    const existingItems: ExistingResultItem[] = existingRows.map((r) => ({
      id: r.id,
      position: r.position,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
      participantName:
        r.registration?.team?.name ??
        r.registration?.user?.name ??
        r.customParticipantName ??
        "Participant",
    }));

    // Auto-calculate position: after podium (at least 4)
    const currentMax = existingRows.reduce((max, r) => Math.max(max, r.position), 3);
    const assignedPosition = startingPosition && startingPosition >= 4 ? startingPosition : currentMax + 1;

    const validation = validateBatchAwardPayload(
      registrationIds,
      award,
      assignedPosition,
      existingItems
    );
    if (!validation.valid) {
      return { ok: false, error: validation.error || "Invalid batch award inputs." };
    }

    // Save in one transaction
    await prisma.$transaction(
      registrationIds.map((regId) =>
        prisma.result.create({
          data: {
            eventId,
            registrationId: regId,
            position: assignedPosition,
            award,
            isTie: false,
          },
        })
      )
    );

    await revalidateResultsPaths(event.slug, event.id);

    return { ok: true, data: { addedCount: registrationIds.length } };
  } catch (err) {
    console.error("addBatchAwardAction error:", err);
    return { ok: false, error: mapPrismaError(err, "Failed to save batch awards.") };
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

/**
 * Swaps positions of two results ranked 1 to 3 in the same event.
 * Done in ONE transaction using a temporary position above 3 (e.g. 1000)
 * so the partial unique index results_event_podium_unique_idx is never violated.
 * Automatic award labels are updated accordingly.
 */
export async function swapPodiumResultsAction(
  eventId: string,
  resultIdA: string,
  resultIdB: string
): Promise<ActionResult<{ swapped: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const [resultA, resultB] = await Promise.all([
      prisma.result.findUnique({
        where: { id: resultIdA },
        include: { event: { select: { id: true, slug: true } } },
      }),
      prisma.result.findUnique({
        where: { id: resultIdB },
        include: { event: { select: { id: true, slug: true } } },
      }),
    ]);

    if (!resultA || !resultB) {
      return { ok: false, error: "One or both results were not found." };
    }

    if (resultA.eventId !== eventId || resultB.eventId !== eventId) {
      return { ok: false, error: "Both results must belong to this event." };
    }

    const swapCheck = planPodiumSwap(
      { id: resultA.id, position: resultA.position, eventId: resultA.eventId },
      { id: resultB.id, position: resultB.position, eventId: resultB.eventId }
    );

    if (!swapCheck.valid || !swapCheck.plan) {
      return { ok: false, error: swapCheck.error || "Invalid podium swap." };
    }

    const { tempPosition, resultA: planA, resultB: planB } = swapCheck.plan;

    // Execute in ONE atomic transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Move result A to temporary position above 3 (never violates partial unique index)
      await tx.result.update({
        where: { id: planA.id },
        data: { position: tempPosition },
      });

      // Step 2: Move result B to result A's original position and update its award
      await tx.result.update({
        where: { id: planB.id },
        data: {
          position: planB.targetPosition,
          award: planB.targetAward,
        },
      });

      // Step 3: Move result A from temp position to result B's original position and update its award
      await tx.result.update({
        where: { id: planA.id },
        data: {
          position: planA.targetPosition,
          award: planA.targetAward,
        },
      });
    });

    await revalidateResultsPaths(resultA.event.slug, eventId);

    return { ok: true, data: { swapped: true } };
  } catch (err) {
    console.error("swapPodiumResultsAction error:", err);
    return { ok: false, error: "Failed to swap podium positions. Please retry." };
  }
}

