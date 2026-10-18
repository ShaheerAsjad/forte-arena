import { z } from "zod";

export const scanCheckInSchema = z.object({
  token: z.string().trim().min(1, "QR token is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type ScanCheckInInput = z.infer<typeof scanCheckInSchema>;

export const manualCheckInSchema = z.object({
  query: z.string().trim().min(1, "Student name, roll number, or token is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;

export const undoCheckInSchema = z.object({
  registrationId: z.string().trim().min(1, "Registration ID is required"),
});

export type UndoCheckInInput = z.infer<typeof undoCheckInSchema>;

export const eventAttendanceQuerySchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export type EventAttendanceQueryInput = z.infer<typeof eventAttendanceQuerySchema>;
