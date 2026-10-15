import { describe, it, expect } from "vitest";
import { isPlaceholderSecretKey } from "@/features/admin/admin.utils";

describe("Admin Utilities - Secret Key Placeholder Validation", () => {
  it("rejects empty, null, undefined, or whitespace keys", () => {
    expect(isPlaceholderSecretKey(null)).toBe(true);
    expect(isPlaceholderSecretKey(undefined)).toBe(true);
    expect(isPlaceholderSecretKey("")).toBe(true);
    expect(isPlaceholderSecretKey("   ")).toBe(true);
    expect(isPlaceholderSecretKey("\t\n")).toBe(true);
  });

  it("rejects keys containing 'placeholder' (case-insensitive)", () => {
    expect(isPlaceholderSecretKey("placeholder")).toBe(true);
    expect(isPlaceholderSecretKey("YOUR_PLACEHOLDER_KEY")).toBe(true);
    expect(isPlaceholderSecretKey("sb_secret_placeholder_123")).toBe(true);
    expect(isPlaceholderSecretKey("some-Placeholder-value")).toBe(true);
  });

  it("rejects keys containing 'PASTE_SECRET_KEY_HERE' (case-insensitive)", () => {
    expect(isPlaceholderSecretKey("PASTE_SECRET_KEY_HERE")).toBe(true);
    expect(isPlaceholderSecretKey("paste_secret_key_here")).toBe(true);
    expect(isPlaceholderSecretKey("prefix_PASTE_SECRET_KEY_HERE_suffix")).toBe(true);
  });

  it("accepts new format 'sb_secret_...' keys", () => {
    expect(isPlaceholderSecretKey("sb_secret_a1b2c3d4e5f6g7h8i9j0")).toBe(false);
    expect(isPlaceholderSecretKey("sb_secret_production_live_key_99824")).toBe(false);
  });

  it("accepts legacy JWT format 'eyJ...' keys", () => {
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.signature";
    expect(isPlaceholderSecretKey(fakeJwt)).toBe(false);
  });

  it("accepts arbitrary valid production secret strings", () => {
    expect(isPlaceholderSecretKey("prod_live_sec_874182903714901847120")).toBe(false);
  });
});
