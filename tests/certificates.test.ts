import { describe, it, expect } from "vitest";
import {
  detectImageSignature,
  validateCertificateFile,
  parseCertificateStoragePath,
  sanitizeAsciiFilename,
  buildContentDispositionHeader,
  MAX_CERTIFICATE_SIZE_BYTES,
} from "@/features/results/certificates.utils";

describe("Certificates Utils: Magic Bytes Image Detection", () => {
  it("detects valid PNG image from 8-byte header", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectImageSignature(pngHeader)).toBe("png");
  });

  it("detects valid JPEG image from 3-byte SOI header", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectImageSignature(jpegHeader)).toBe("jpg");
  });

  it("detects valid WebP image from RIFF...WEBP header", () => {
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x24, 0x00, 0x00, 0x00, // file size
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
      0x56, 0x50, 0x38, 0x20, // 'VP8 '
    ]);
    expect(detectImageSignature(webpHeader)).toBe("webp");
  });

  it("rejects unknown or invalid file signatures (e.g. plain text, PDF, GIF)", () => {
    const textHeader = Buffer.from("Hello world! This is plain text.");
    expect(detectImageSignature(textHeader)).toBeNull();

    const pdfHeader = Buffer.from("%PDF-1.4 1 0 obj << /Type /Catalog >>");
    expect(detectImageSignature(pdfHeader)).toBeNull();

    const gifHeader = Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00");
    expect(detectImageSignature(gifHeader)).toBeNull();

    const emptyHeader = Buffer.from([]);
    expect(detectImageSignature(emptyHeader)).toBeNull();
  });
});

describe("Certificates Utils: File Size & Format Validation", () => {
  it("approves valid PNG file within 3 MB", () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = validateCertificateFile(validPng, 500 * 1024); // 500 KB
    expect(result.valid).toBe(true);
    expect(result.ext).toBe("png");
    expect(result.mime).toBe("image/png");
    expect(result.error).toBeUndefined();
  });

  it("rejects files exceeding 3 MB limit", () => {
    const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const overSize = MAX_CERTIFICATE_SIZE_BYTES + 1024;
    const result = validateCertificateFile(validJpg, overSize);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds the 3 MB limit");
  });

  it("rejects empty files", () => {
    const empty = Buffer.from([]);
    const result = validateCertificateFile(empty, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("file is empty");
  });

  it("rejects corrupted or disguised text file", () => {
    const fakeImage = Buffer.from("Not really a PNG image file content here.");
    const result = validateCertificateFile(fakeImage, 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not match a valid PNG, JPEG, or WebP image");
  });
});

describe("Certificates Utils: Storage Path Parsing & Security", () => {
  it("extracts valid relative path from Supabase public URL", () => {
    const url = "https://my-ref.supabase.co/storage/v1/object/public/event-media/certificates/evt-hackathon-2026/cert-123.png";
    expect(parseCertificateStoragePath(url)).toBe("certificates/evt-hackathon-2026/cert-123.png");
  });

  it("extracts valid relative path from direct path without domain", () => {
    const path = "/event-media/certificates/evt-42/winner-gold.webp";
    expect(parseCertificateStoragePath(path)).toBe("certificates/evt-42/winner-gold.webp");
  });

  it("rejects paths outside certificates/ namespace", () => {
    const posterUrl = "https://my-ref.supabase.co/storage/v1/object/public/event-media/posters/banner.jpg";
    expect(parseCertificateStoragePath(posterUrl)).toBeNull();

    const avatarUrl = "https://my-ref.supabase.co/storage/v1/object/public/event-media/avatars/user-1.png";
    expect(parseCertificateStoragePath(avatarUrl)).toBeNull();
  });

  it("rejects directory traversal attempts", () => {
    const traversalUrl1 = "https://my-ref.supabase.co/storage/v1/object/public/event-media/certificates/../posters/secret.png";
    expect(parseCertificateStoragePath(traversalUrl1)).toBeNull();

    const traversalUrl2 = "certificates/../../etc/passwd";
    expect(parseCertificateStoragePath(traversalUrl2)).toBeNull();
  });

  it("rejects empty or root certificates paths", () => {
    expect(parseCertificateStoragePath("")).toBeNull();
    expect(parseCertificateStoragePath("certificates/")).toBeNull();
  });
});

describe("Certificates Utils: Content-Disposition & Filename Sanitizer", () => {
  it("sanitizes filenames containing quotes, line breaks, and slashes for ASCII fallback", () => {
    const malicious = `cert"ificate\r\n\t<special>:name.png`;
    const clean = sanitizeAsciiFilename(malicious);
    expect(clean).not.toContain('"');
    expect(clean).not.toContain("\r");
    expect(clean).not.toContain("\n");
    expect(clean).not.toContain("<");
    expect(clean).not.toContain(">");
    expect(clean).not.toContain(":");
    expect(clean.endsWith(".png")).toBe(true);
  });

  it("safely handles non-ASCII and Urdu script names in ASCII fallback", () => {
    // Pure Urdu name: "محمد علی"
    const urduName = "محمد علی.png";
    const clean = sanitizeAsciiFilename(urduName, "certificate.png");
    // Since non-ASCII is stripped, fallback should be used cleanly
    expect(clean).toBe("certificate.png");

    // Mixed English and Urdu name: "Speed Coding - علی خان.png"
    const mixed = "Speed Coding - علی خان.png";
    const cleanMixed = sanitizeAsciiFilename(mixed);
    expect(cleanMixed).toContain("Speed_Coding");
    expect(cleanMixed.endsWith(".png")).toBe(true);
  });

  it("caps the ASCII filename length to 60 characters preserving extension", () => {
    const longName = "A".repeat(100) + ".webp";
    const clean = sanitizeAsciiFilename(longName);
    expect(clean.endsWith(".webp")).toBe(true);
    // Base name length must be <= 60
    const base = clean.replace(/\.webp$/, "");
    expect(base.length).toBeLessThanOrEqual(60);
  });

  it("builds a safe Content-Disposition header with RFC 5987 UTF-8 encoding for Urdu names", () => {
    const filename = "certificate-hackathon-محمد علی.png";
    const header = buildContentDispositionHeader(filename);

    // Must start with attachment;
    expect(header).toMatch(/^attachment;\s*filename="[^"\r\n]+";\s*filename\*=UTF-8''/);

    // ASCII fallback must be quoted and must not contain non-ASCII characters or quotes
    const asciiMatch = header.match(/filename="([^"]+)"/);
    expect(asciiMatch).toBeTruthy();
    const asciiFallback = asciiMatch![1];
    expect(/^[\x20-\x7E]+$/.test(asciiFallback)).toBe(true);
    expect(asciiFallback).not.toContain("\r");
    expect(asciiFallback).not.toContain("\n");

    // filename* must contain percent-encoded Urdu characters
    expect(header).toContain("filename*=UTF-8''");
    // Verify encoded Urdu characters exist (percent-encoded %D9%... etc.)
    expect(header).toMatch(/%D9%[0-9A-Fa-f]{2}/);
  });

  it("prevents CRLF response header splitting in Content-Disposition", () => {
    const headerInjection = "cert.png\r\nSet-Cookie: admin=true\r\n";
    const header = buildContentDispositionHeader(headerInjection);
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
  });
});
