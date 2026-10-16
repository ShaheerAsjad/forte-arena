import { z } from "zod";

export const PODIUM_AWARDS: Record<number, string> = {
  1: "Champion",
  2: "Runner-up",
  3: "Second Runner-up",
};

export const POSITION_LABELS: Record<number, string> = {
  1: "1st Place",
  2: "2nd Place",
  3: "3rd Place",
};

export const RUNNER_AWARD_PRESETS = [
  "Honorable Mention",
  "Participation",
] as const;

export type RunnerAwardPreset = (typeof RUNNER_AWARD_PRESETS)[number];

export const AWARD_PRESETS = [
  "Champion",
  "Runner-up",
  "Second Runner-up",
  "Honorable Mention",
  "Participation",
] as const;

export type AwardPreset = (typeof AWARD_PRESETS)[number];

/**
 * Returns the read-only automatic award label for positions 1, 2, and 3.
 * Returns null for position 4 and higher.
 */
export function getAutomaticAwardForPosition(position: number): string | null {
  return PODIUM_AWARDS[position] ?? null;
}

/**
 * Validates award title based on rank.
 * Positions 1..3 strictly require Champion, Runner-up, Second Runner-up.
 * Positions 4+ allow Honorable Mention, Participation or custom non-empty text.
 */
export function validateAwardForPosition(
  position: number,
  award: string
): { valid: boolean; error?: string } {
  const cleanAward = award.trim();
  if (!cleanAward) {
    return { valid: false, error: "Award title is required." };
  }

  if (position <= 3) {
    const requiredAward = PODIUM_AWARDS[position];
    if (cleanAward.toLowerCase() !== requiredAward.toLowerCase()) {
      return {
        valid: false,
        error: `Position #${position} must have the award title "${requiredAward}".`,
      };
    }
  } else {
    const forbidden = ["champion", "runner-up", "second runner-up"];
    if (forbidden.includes(cleanAward.toLowerCase())) {
      return {
        valid: false,
        error: "Positions 4 and higher cannot be awarded Champion or Runner-up.",
      };
    }
  }

  return { valid: true };
}

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
    isTie: z.boolean().optional().default(false),
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
  participantName: string;
  registrationId?: string | null;
  customParticipantName?: string | null;
}

/**
 * Validates rank uniqueness:
 * Positions 1, 2, and 3 are unique per event, NO EXCEPTIONS.
 * Once a result holds position 1 (or 2 or 3) in an event, no other result
 * in that event may take it. Positions 4 and higher may repeat.
 */
export function validateRankUniqueness(
  newPosition: number,
  existingResults: ExistingResultItem[],
  currentResultId?: string
): { valid: boolean; error?: string } {
  if (newPosition < 1) {
    return { valid: false, error: "Position must be 1 or higher." };
  }

  // Filter out the item currently being edited
  const otherResults = existingResults.filter((r) => r.id !== currentResultId);

  // Positions 1 to 3 are strictly unique per event with no exceptions
  if (newPosition <= 3) {
    const conflicting = otherResults.find((r) => r.position === newPosition);
    if (conflicting) {
      const rankLabel = POSITION_LABELS[newPosition] || `Position ${newPosition}`;
      return {
        valid: false,
        error: `${rankLabel} is already given to "${conflicting.participantName}".`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates participant uniqueness:
 * A participant or team can have at most one result row per event.
 * (Someone who is Champion cannot also be Runner-up or hold any other result).
 * Walk-in names are compared case-insensitively and trimmed within the event.
 */
export function validateParticipantUniqueness(
  participantType: "REGISTERED" | "WALKIN",
  registrationId: string | null | undefined,
  customParticipantName: string | null | undefined,
  existingResults: ExistingResultItem[],
  currentResultId?: string
): { valid: boolean; error?: string } {
  const otherResults = existingResults.filter((r) => r.id !== currentResultId);

  if (participantType === "REGISTERED" && registrationId) {
    const conflicting = otherResults.find((r) => r.registrationId === registrationId);
    if (conflicting) {
      return {
        valid: false,
        error: `"${conflicting.participantName}" already has a result recorded for this event.`,
      };
    }
  }

  if (participantType === "WALKIN" && customParticipantName) {
    const cleanName = customParticipantName.trim().toLowerCase();
    if (!cleanName) {
      return { valid: false, error: "Participant name cannot be empty." };
    }

    const conflicting = otherResults.find((r) => {
      const walkinMatch = r.customParticipantName?.trim().toLowerCase() === cleanName;
      const generalMatch = r.participantName.trim().toLowerCase() === cleanName;
      return walkinMatch || generalMatch;
    });

    if (conflicting) {
      return {
        valid: false,
        error: `A participant named "${customParticipantName.trim()}" already has a result recorded for this event.`,
      };
    }
  }

  return { valid: true };
}

export interface QuickPodiumSlot {
  participantType: "REGISTERED" | "WALKIN";
  registrationId?: string | null;
  customParticipantName?: string | null;
  participantName?: string;
}

export interface QuickPodiumPayload {
  eventId: string;
  first?: QuickPodiumSlot | null;
  second?: QuickPodiumSlot | null;
  third?: QuickPodiumSlot | null;
}

/**
 * Validates quick podium inputs:
 * - At least one slot chosen
 * - No two slots assign the same participant
 * - No slot assigns a participant who already holds another result in the event
 */
export function validateQuickPodiumPayload(
  payload: QuickPodiumPayload,
  existingResults: ExistingResultItem[]
): { valid: boolean; error?: string } {
  const slots: Array<{ pos: number; label: string; slot: QuickPodiumSlot }> = [];
  if (payload.first) slots.push({ pos: 1, label: "1st Place", slot: payload.first });
  if (payload.second) slots.push({ pos: 2, label: "2nd Place", slot: payload.second });
  if (payload.third) slots.push({ pos: 3, label: "3rd Place", slot: payload.third });

  if (slots.length === 0) {
    return {
      valid: false,
      error: "Please select at least one podium winner (1st, 2nd, or 3rd).",
    };
  }

  // 1. Check for duplicates across the selected slots
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i].slot;
      const b = slots[j].slot;

      // Both registered
      if (
        a.participantType === "REGISTERED" &&
        b.participantType === "REGISTERED" &&
        a.registrationId &&
        b.registrationId &&
        a.registrationId === b.registrationId
      ) {
        return {
          valid: false,
          error: `Cannot assign the same participant (${slots[i].slot.participantName || "Participant"}) to both ${slots[i].label} and ${slots[j].label}.`,
        };
      }

      // Check walk-in names
      const nameA = (a.customParticipantName || a.participantName || "").trim().toLowerCase();
      const nameB = (b.customParticipantName || b.participantName || "").trim().toLowerCase();
      if (nameA && nameB && nameA === nameB) {
        return {
          valid: false,
          error: `Cannot assign the same participant ("${a.customParticipantName || a.participantName}") to both ${slots[i].label} and ${slots[j].label}.`,
        };
      }
    }
  }

  // 2. Check conflict with existing results for each slot's position and participant
  for (const item of slots) {
    const existingAtPos = existingResults.find((r) => r.position === item.pos);
    if (existingAtPos) {
      return {
        valid: false,
        error: `${item.label} is already given to "${existingAtPos.participantName}". Delete or edit the existing result first.`,
      };
    }

    const participantValidation = validateParticipantUniqueness(
      item.slot.participantType,
      item.slot.registrationId,
      item.slot.customParticipantName,
      existingResults
    );
    if (!participantValidation.valid) {
      return participantValidation;
    }
  }

  return { valid: true };
}

/**
 * Validates batch award payload ("Add several with the same award"):
 * - At least one registration selected
 * - Award is Honorable Mention or Participation
 * - None of the selected participants already have a result
 * - Starting position must be 4 or higher
 */
export function validateBatchAwardPayload(
  registrationIds: string[],
  award: string = "Participation",
  existingResultsOrStartingPos?: ExistingResultItem[] | number,
  optionalExistingResults?: ExistingResultItem[] | number
): { valid: boolean; error?: string; startingPosition: number } {
  let startingPosition: number | undefined;
  let existingResults: ExistingResultItem[] = [];

  if (typeof existingResultsOrStartingPos === "number") {
    startingPosition = existingResultsOrStartingPos;
    if (Array.isArray(optionalExistingResults)) {
      existingResults = optionalExistingResults;
    }
  } else if (Array.isArray(existingResultsOrStartingPos)) {
    existingResults = existingResultsOrStartingPos;
    if (typeof optionalExistingResults === "number") {
      startingPosition = optionalExistingResults;
    }
  }

  const currentMax = existingResults.reduce((max, r) => Math.max(max, r.position), 3);
  const resolvedStartingPosition =
    startingPosition && startingPosition >= 4 ? startingPosition : currentMax + 1;

  if (!registrationIds || registrationIds.length === 0) {
    return {
      valid: false,
      error: "Please select at least one participant.",
      startingPosition: resolvedStartingPosition,
    };
  }

  // Check for duplicates inside the batch
  const uniqueRegIds = new Set(registrationIds);
  if (uniqueRegIds.size !== registrationIds.length) {
    return {
      valid: false,
      error: "Selected participants list contains duplicates.",
      startingPosition: resolvedStartingPosition,
    };
  }

  if (award !== "Honorable Mention" && award !== "Participation") {
    return {
      valid: false,
      error: 'Batch award must be either "Honorable Mention" or "Participation".',
      startingPosition: resolvedStartingPosition,
    };
  }

  if (resolvedStartingPosition < 4) {
    return {
      valid: false,
      error:
        "Batch awards must be assigned to Position 4 or higher (positions 1-3 are reserved for podium).",
      startingPosition: resolvedStartingPosition,
    };
  }

  const existingRegIds = new Set(
    existingResults.map((r) => r.registrationId).filter(Boolean)
  );

  for (const regId of registrationIds) {
    if (existingRegIds.has(regId)) {
      const match = existingResults.find((r) => r.registrationId === regId);
      return {
        valid: false,
        error: `"${match?.participantName || "A selected participant"}" already has a result recorded for this event.`,
        startingPosition: resolvedStartingPosition,
      };
    }
  }

  return { valid: true, startingPosition: resolvedStartingPosition };
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
