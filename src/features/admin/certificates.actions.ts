"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";
import { isPlaceholderSecretKey } from "./admin.utils";
import {
  validateCertificateFile,
  parseCertificateStoragePath,
} from "@/features/results/certificates.utils";

function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  if (isPlaceholderSecretKey(serviceRoleKey)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured or is a placeholder. Please configure a valid secret key for SUPABASE_SERVICE_ROLE_KEY in .env or .env.local."
    );
  }

  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured or invalid. Please configure NEXT_PUBLIC_SUPABASE_URL in .env or .env.local."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function revalidateCertificatePaths(eventSlug: string, eventId: string, resultId: string) {
  revalidatePath("/admin/results");
  revalidatePath(`/admin/results/${eventId}`);
  revalidatePath("/results");
  revalidatePath(`/results/${eventSlug}`);
  revalidatePath(`/results/${eventSlug}/certificate/${resultId}`);
  revalidatePath("/dashboard");
}

/**
 * Upload or replace a certificate image for a specific competition result.
 */
export async function uploadCertificateAction(
  resultId: string,
  eventId: string,
  formData: FormData
): Promise<ActionResult<{ certificateUrl: string }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    // 1. Verify result exists and belongs to this event
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        event: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!result || result.eventId !== eventId) {
      return { ok: false, error: "Result entry not found for this event." };
    }

    // 2. Extract and validate file
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "No certificate file provided." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateCertificateFile(buffer, file.size);
    if (!validation.valid || !validation.ext || !validation.mime) {
      return { ok: false, error: validation.error || "Invalid certificate image file." };
    }

    // 3. Initialize Supabase storage client
    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch (envErr) {
      return {
        ok: false,
        error: envErr instanceof Error ? envErr.message : "Supabase configuration error.",
      };
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "event-media";

    // 4. If replacing an existing certificate, safely remove the old file
    if (result.certificateUrl) {
      const oldStoragePath = parseCertificateStoragePath(result.certificateUrl);
      if (oldStoragePath && oldStoragePath.startsWith("certificates/")) {
        try {
          await supabase.storage.from(bucket).remove([oldStoragePath]);
        } catch {
          // Continue upload even if old object deletion fails
        }
      }
    }

    // 5. Upload new certificate image with random filename
    const randomFilename = `${crypto.randomUUID()}.${validation.ext}`;
    const storagePath = `certificates/${eventId}/${randomFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: validation.mime,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: `Certificate storage upload failed: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const certificateUrl = publicUrlData.publicUrl;

    // 6. Save URL in database
    await prisma.result.update({
      where: { id: resultId },
      data: { certificateUrl },
    });

    revalidateCertificatePaths(result.event.slug, eventId, resultId);

    return {
      ok: true,
      data: { certificateUrl },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload certificate image.";
    return { ok: false, error: message };
  }
}

/**
 * Remove an uploaded certificate from a result and delete it from storage.
 */
export async function removeCertificateAction(
  resultId: string,
  eventId: string
): Promise<ActionResult<{ removed: boolean }>> {
  try {
    await requireRole(["ORGANIZER", "ADMIN"]);

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        event: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!result || result.eventId !== eventId) {
      return { ok: false, error: "Result entry not found." };
    }

    if (result.certificateUrl) {
      const storagePath = parseCertificateStoragePath(result.certificateUrl);
      if (storagePath && storagePath.startsWith("certificates/")) {
        let supabase;
        try {
          supabase = getSupabaseAdminClient();
        } catch (envErr) {
          return {
            ok: false,
            error: envErr instanceof Error ? envErr.message : "Supabase configuration error.",
          };
        }
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "event-media";
        const { error: removeError } = await supabase.storage.from(bucket).remove([storagePath]);
        if (removeError) {
          return {
            ok: false,
            error: `Failed to remove certificate from storage: ${removeError.message}`,
          };
        }
      }
    }

    await prisma.result.update({
      where: { id: resultId },
      data: { certificateUrl: null },
    });

    revalidateCertificatePaths(result.event.slug, eventId, resultId);

    return {
      ok: true,
      data: { removed: true },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove certificate.";
    return { ok: false, error: message };
  }
}
