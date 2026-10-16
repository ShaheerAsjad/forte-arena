/**
 * Certificate image validation and storage path utility functions.
 */

export const MAX_CERTIFICATE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export type DetectedImageType = "png" | "jpg" | "webp";

/**
 * Verify the real image file format from its header magic bytes.
 *
 * Magic bytes signatures:
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - JPEG: FF D8 FF
 * - WebP: 52 49 46 46 (RIFF) at offset 0, and 57 45 42 50 (WEBP) at offset 8
 */
export function detectImageSignature(
  bytes: Uint8Array | Buffer
): DetectedImageType | null {
  if (!bytes || bytes.length < 12) {
    return null;
  }

  // Check PNG (8 bytes: 89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // Check JPEG (3 bytes: FF D8 FF)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  // Check WebP (RIFF at 0..3 and WEBP at 8..11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

/**
 * Validates file buffer size and magic bytes signature.
 */
export function validateCertificateFile(
  bytes: Uint8Array | Buffer,
  size: number
): { valid: boolean; ext?: DetectedImageType; mime?: string; error?: string } {
  if (size <= 0 || bytes.length === 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (size > MAX_CERTIFICATE_SIZE_BYTES) {
    const sizeMb = (size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 3 MB limit for certificates.`,
    };
  }

  const detectedExt = detectImageSignature(bytes);
  if (!detectedExt) {
    return {
      valid: false,
      error:
        "Invalid file content. The file signature does not match a valid PNG, JPEG, or WebP image.",
    };
  }

  const mimeMap: Record<DetectedImageType, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
  };

  return {
    valid: true,
    ext: detectedExt,
    mime: mimeMap[detectedExt],
  };
}

/**
 * Parse storage relative path from a full public Supabase URL.
 * Strictly guarantees the path is within the 'certificates/' namespace
 * and forbids directory traversal.
 *
 * Example input:
 *   "https://xyz.supabase.co/storage/v1/object/public/event-media/certificates/evt-1/uuid.png"
 * Output:
 *   "certificates/evt-1/uuid.png"
 */
export function parseCertificateStoragePath(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  try {
    let pathPart = rawUrl;

    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      const parsed = new URL(rawUrl);
      pathPart = parsed.pathname;
    }

    // Look for "/event-media/" or starting directly with "certificates/"
    const marker = "/event-media/";
    const markerIdx = pathPart.indexOf(marker);

    let relativePath: string;
    if (markerIdx !== -1) {
      relativePath = pathPart.substring(markerIdx + marker.length);
    } else {
      // If URL directly contains "/certificates/"
      const certIdx = pathPart.indexOf("/certificates/");
      if (certIdx !== -1) {
        relativePath = pathPart.substring(certIdx + 1);
      } else if (pathPart.startsWith("certificates/")) {
        relativePath = pathPart;
      } else {
        return null;
      }
    }

    // Clean up leading slashes and decoded URI parts
    relativePath = decodeURIComponent(relativePath).replace(/^\/+/, "");

    // Path must start with "certificates/"
    if (!relativePath.startsWith("certificates/")) {
      return null;
    }

    // Must not contain path traversal components ("..")
    const segments = relativePath.split("/");
    if (segments.some((seg) => seg === ".." || seg === "." || seg === "")) {
      return null;
    }

    // Must have at least "certificates/<file_or_dir>"
    if (segments.length < 2) {
      return null;
    }

    return relativePath;
  } catch {
    return null;
  }
}

/**
 * Builds a safe ASCII-only fallback filename.
 * Strips quotes, CRLF/newlines, backslashes, control characters, and non-ASCII chars.
 * Limits the length to avoid legacy browser header overflows.
 */
export function sanitizeAsciiFilename(name: string, fallback: string = "certificate.png"): string {
  // Extract extension if present
  const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1]}` : "";
  const nameWithoutExt = extMatch ? name.slice(0, -ext.length) : name;

  // Remove control characters, newlines, quotes, backslashes, semicolons
  let clean = nameWithoutExt.replace(/[\r\n\t"'\\]/g, "");
  // Replace dangerous filesystem characters with hyphens
  clean = clean.replace(/[<>:;/|?*]/g, "-");
  // Replace non-ASCII characters with hyphens or strip
  clean = clean.replace(/[^\x20-\x7E]/g, "").trim();
  // Collapse whitespace
  clean = clean.replace(/\s+/g, "_").replace(/-+/g, "-").replace(/_+/g, "_");

  // If empty after stripping (e.g. pure Urdu or non-ASCII name), use fallback
  if (!clean || clean === "_" || clean === "-") {
    return fallback;
  }

  // Limit length of base filename to 60 characters
  const truncated = clean.slice(0, 60);
  return `${truncated}${ext}`;
}

/**
 * Safely constructs a Content-Disposition header supporting both:
 * 1. ASCII-only fallback filename (quotes stripped, CRLF removed, non-ASCII stripped)
 * 2. RFC 5987 / RFC 6266 filename*=UTF-8''<percent-encoded full name>
 *
 * Ensures names in Urdu script or containing quotes/linebreaks never throw or break downloads.
 */
export function buildContentDispositionHeader(rawFilename: string): string {
  // Strip linebreaks to completely prevent HTTP response header injection (CRLF splitting)
  const singleLine = rawFilename.replace(/[\r\n]/g, " ").trim();

  // Extract extension
  const extMatch = singleLine.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "png";
  const defaultFallback = `certificate.${ext}`;

  const asciiFallback = sanitizeAsciiFilename(singleLine, defaultFallback);

  // RFC 5987 encode filename*
  const rfc5987Encoded = encodeURIComponent(singleLine)
    .replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987Encoded}`;
}
