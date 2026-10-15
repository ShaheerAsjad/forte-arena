"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";
import { isPlaceholderSecretKey } from "./admin.utils";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Upload an event poster to Supabase Storage bucket 'event-media'.
 * Uses the secret service role key SERVER-SIDE ONLY.
 */
export async function uploadPosterAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    // 1. Authorization check
    await requireRole(["ORGANIZER", "ADMIN"]);

    // 2. Validate environment keys
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

    // 3. Extract and validate file
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "No file was provided for upload." };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `File size exceeds the 2 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: "Invalid file format. Only PNG, JPEG, and WebP images are allowed.",
      };
    }

    // 4. Determine file extension and random path
    let ext = "png";
    if (file.type === "image/jpeg") ext = "jpg";
    if (file.type === "image/webp") ext = "webp";

    const randomFilename = `${crypto.randomUUID()}.${ext}`;
    const filePath = `posters/${randomFilename}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "event-media";

    // 5. Initialize server-side Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        error: `Storage upload failed: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      ok: true,
      data: {
        url: publicUrlData.publicUrl,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload event poster.";
    return { ok: false, error: message };
  }
}
