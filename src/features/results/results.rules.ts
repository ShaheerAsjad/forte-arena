import { z } from "zod";

export const AWARD_PRESETS = [
  "Champion",
  "Runner-up",
  "Second Runner-up",
  "Honorable Mention",
  "Participation",
] as const;

export type AwardPreset = (typeof AWARD_PRESETS)[number];

export const resultFormSchema = z
  .object({
    eventId: z.string().min(1, "Event ID is required"),
    participantType: z.enum(["REGISTERED", "WALKIN"]),
    registrationId: z.string().optional().nullable(),
    customParticipantName: z.string().optional().nullable(),
    position: z.coerce.number().int().min(1, "Position must be 1 or higher"),
    award: z.string().min(1, "Award label is required"),
    score: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    isTie: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.participantType === "REGISTERED") {
        return Boolean(data.registrationId && data.registrationId.trim().length > 0);
      }
      return Boolean(data.customParticipantName && data.customParticipantName.trim().length > 0);
    },
    {
      message: "Please choose an approved participant or enter a walk-in name.",
      path: ["participantType"],
    }
  );

export type ResultFormValues = z.infer<typeof resultFormSchema>;

export interface ExistingResultItem {
  id: string;
  position: number;
  isTie: boolean;
  participantName: string;
  registrationId?: string | null;
}

/**
 * Validates rank uniqueness rules:
 * Positions 1, 2, and 3 must be unique unless the 'tie' flag is ticked.
 */
export function validateRankUniqueness(
  newPosition: number,
  isTie: boolean,
  existingResults: ExistingResultItem[],
  currentResultId?: string
): { valid: boolean; error?: string } {
  if (newPosition < 1) {
    return { valid: false, error: "Position must be 1 or higher." };
  }

  // Filter out the item currently being edited
  const otherResults = existingResults.filter((r) => r.id !== currentResultId);

  // Positions 1 to 3 require uniqueness unless tie is ticked
  if (newPosition <= 3) {
    const conflicting = otherResults.find((r) => r.position === newPosition);

    if (conflicting) {
      // If either the new one or existing one is NOT marked as tie, it's a conflict
      if (!isTie || !conflicting.isTie) {
        const rankNames = ["1st Place (Champion)", "2nd Place (Runner-up)", "3rd Place"];
        const rankLabel = rankNames[newPosition - 1] || `Position ${newPosition}`;
        return {
          valid: false,
          error: `${rankLabel} is already awarded to "${conflicting.participantName}". Tick "Tie" if this position is shared.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates whether an event can be published.
 * Publishing is only allowed when:
 * 1. Event status is 'COMPLETED'
 * 2. At least 1 result has been added
 */
export function validateEventPublishability(
  eventStatus: string,
  resultsCount: number
): { canPublish: boolean; error?: string } {
  if (eventStatus !== "COMPLETED") {
    return {
      canPublish: false,
      error: `Results can only be published once the event is COMPLETED (currently "${eventStatus}"). Mark the event as Completed first.`,
    };
  }

  if (resultsCount === 0) {
    return {
      canPublish: false,
      error: "Cannot publish results because no results have been added for this event.",
    };
  }

  return { canPublish: true };
}
