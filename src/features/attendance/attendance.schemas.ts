import { z } from "zod";

/**
 * Forté Arena check-in tokens are 24 cryptographically random bytes encoded in base64url,
 * which always yields exactly 32 URL-safe characters [A-Za-z0-9_-].
 */
export const CHECK_IN_TOKEN_REGEX = /^[A-Za-z0-9_-]{32}$/;

/**
 * Normalizes scanned or manually pasted token input:
 * Trims leading/trailing whitespace, strips quotes if wrapped, and removes newlines.
 */
export function normalizeCheckInToken(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\r\n\t]/g, "")
    .trim();
}

/**
 * Validates whether a token strictly matches the 32-character base64url Forté Arena format.
 */
export function isCheckInTokenFormatValid(token: string): boolean {
  return CHECK_IN_TOKEN_REGEX.test(token);
}

export const ATTENDANCE_METHODS = ["QR", "MANUAL"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];
export const attendanceMethodSchema = z.enum(ATTENDANCE_METHODS);


export const scanCheckInSchema = z.object({
  token: z.string().trim().min(1, "QR token is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type ScanCheckInInput = z.infer<typeof scanCheckInSchema>;

export const manualCheckInSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required"),
  participantType: z.enum(["SOLO", "TEAM_MEMBER"]).default("SOLO"),
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;

export const undoCheckInSchema = z
  .object({
    participantId: z.string().trim().min(1).optional(),
    participantType: z.enum(["SOLO", "TEAM_MEMBER"]).default("SOLO"),
    registrationId: z.string().trim().min(1).optional(),
  })
  .transform((data) => ({
    participantId: data.participantId || data.registrationId || "",
    participantType: data.participantType,
  }))
  .refine((data) => Boolean(data.participantId), {
    message: "Either participantId or registrationId must be provided",
  });

export type UndoCheckInInput = z.input<typeof undoCheckInSchema>;

export const eventAttendanceQuerySchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type EventAttendanceQueryInput = z.infer<typeof eventAttendanceQuerySchema>;
