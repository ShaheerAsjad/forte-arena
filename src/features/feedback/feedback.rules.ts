import { z } from "zod";
import type { EventStatus, RegistrationStatus } from "@/lib/db-types";
import { getEffectiveStatus } from "@/features/events/events.derived";

export const feedbackInputSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  comment: z
    .string()
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null)),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export interface FeedbackEligibilityInput {
  registrationStatus: RegistrationStatus;
  event: {
    status: EventStatus;
    startsAt: Date | string;
    endsAt?: Date | string | null;
    registrationDeadline: Date | string;
    resultsPublished?: boolean;
  };
}

export interface FeedbackEligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Check if a student is eligible to submit feedback:
 * 1. Registration must be APPROVED.
 * 2. Event must be COMPLETED (either explicitly COMPLETED, results published, or endsAt passed).
 */
export function checkFeedbackEligibility(
  input: FeedbackEligibilityInput
): FeedbackEligibilityResult {
  if (input.registrationStatus !== "APPROVED") {
    return {
      eligible: false,
      reason: "Only approved participants can submit feedback for this event.",
    };
  }

  const effectiveStatus = getEffectiveStatus(input.event);
  if (effectiveStatus !== "COMPLETED") {
    return {
      eligible: false,
      reason: "Feedback can only be submitted once the event is completed.",
    };
  }

  return { eligible: true };
}

export interface FeedbackDistribution {
  averageRating: number;
  totalResponses: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  ratingPercentages: Record<1 | 2 | 3 | 4 | 5, number>;
}

/**
 * Pure calculation of rating distribution and averages for display and analytics.
 */
export function calculateFeedbackDistribution(
  feedbacks: Array<{ rating: number }>
): FeedbackDistribution {
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!feedbacks || feedbacks.length === 0) {
    return {
      averageRating: 0,
      totalResponses: 0,
      ratingCounts: counts,
      ratingPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  let totalSum = 0;
  for (const item of feedbacks) {
    const r = Math.min(5, Math.max(1, Math.round(item.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[r]++;
    totalSum += r;
  }

  const total = feedbacks.length;
  const avg = Math.round((totalSum / total) * 10) / 10;

  const percentages: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: Math.round((counts[1] / total) * 100),
    2: Math.round((counts[2] / total) * 100),
    3: Math.round((counts[3] / total) * 100),
    4: Math.round((counts[4] / total) * 100),
    5: Math.round((counts[5] / total) * 100),
  };

  return {
    averageRating: avg,
    totalResponses: total,
    ratingCounts: counts,
    ratingPercentages: percentages,
  };
}
