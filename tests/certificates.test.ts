import { describe, it, expect } from "vitest";
import {
  detectImageSignature,
  validateCertificateFile,
  parseCertificateStoragePath,
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
