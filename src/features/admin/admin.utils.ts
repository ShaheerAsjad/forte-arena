/**
 * Admin utilities for slug generation and CSV sanitization.
 */

/**
 * Convert arbitrary title text into a clean, URL-safe slug.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace accented characters
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace non-alphanumeric chars with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Collapse consecutive hyphens
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug by checking against existing slugs.
 */
export async function generateUniqueSlug(
  title: string,
  checkExists: (slug: string) => Promise<boolean>,
  currentSlug?: string
): Promise<string> {
  const baseSlug = slugify(title) || "event";

  // If the event already has this slug, keep it
  if (currentSlug && baseSlug === currentSlug) {
    return currentSlug;
  }

  const exists = await checkExists(baseSlug);
  if (!exists) {
    return baseSlug;
  }

  let counter = 2;
  while (counter < 1000) {
    const candidate = `${baseSlug}-${counter}`;
    if (currentSlug && candidate === currentSlug) {
      return candidate;
    }
    const candidateExists = await checkExists(candidate);
    if (!candidateExists) {
      return candidate;
    }
    counter++;
  }

  return `${baseSlug}-${Date.now()}`;
}

/**
 * Neutralize CSV injection and escape quotes/commas per RFC 4180.
 *
 * CSV Injection neutralization:
 * Cells starting with =, +, -, @ can execute arbitrary formulas in Excel/Google Sheets.
 * Prefixing with a single quote (') disables formula execution.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Check for CSV formula injection characters at the start of string
  const injectionChars = ["=", "+", "-", "@"];
  const trimmed = str.trimStart();
  if (injectionChars.some((char) => trimmed.startsWith(char))) {
    str = `'${str}`;
  }

  // If contains commas, double quotes, or newlines, escape quotes and wrap in quotes
  const mustQuote =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r");

  if (mustQuote) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Format headers and records into an RFC 4180 compliant CSV string.
 */
export function buildCsv(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

/**
 * Validate whether a secret key is missing or a placeholder.
 * Rejects: empty, containing "placeholder" or "PASTE_SECRET_KEY_HERE".
 * Accepts: "sb_secret_..." keys, legacy "eyJ..." JWT keys, or any non-placeholder secret.
 */
export function isPlaceholderSecretKey(key: string | undefined | null): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (trimmed.length === 0) return true;
  const lower = trimmed.toLowerCase();
  if (lower.includes("placeholder")) return true;
  if (lower.includes("paste_secret_key_here")) return true;
  return false;
}

