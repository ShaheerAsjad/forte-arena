"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/action-result";
import {
  feedbackInputSchema,
  checkFeedbackEligibility,
  type FeedbackInput,
} from "./feedback.rules";
import { FeedbackRepository } from "./repositories/feedback.repository";

// ────────────────────────────────────────────────────────────────
// In-Memory Rate Limiter (Per User)
// ────────────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

export interface FeedbackData {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Server action to submit or edit event feedback.
 * Enforces authenticated student, rate limiting, approved registration, completed event, and Zod bounds.
 */
export async function submitFeedbackAction(
  input: FeedbackInput
): Promise<ActionResult<FeedbackData>> {
  try {
    const user = await requireUser();

    // Check rate limit per student
    const isAllowed = checkRateLimit(`feedback:${user.id}`);
    if (!isAllowed) {
      return {
        ok: false,
        error: "Too many feedback updates. Please wait a minute and try again.",
      };
    }

    // Validate inputs
    const parsed = feedbackInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid feedback submission",
      };
    }

    const { eventId, rating, comment } = parsed.data;

    // Verify registration and event status
    const registration = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
      include: {
        event: true,
      },
    });

    if (!registration) {
      return {
        ok: false,
        error: "You can only submit feedback for competitions you participated in.",
      };
    }

    // Check eligibility: must be approved and event must be completed
    const eligibility = checkFeedbackEligibility({
      registrationStatus: registration.status,
      event: registration.event,
    });

    if (!eligibility.eligible) {
      return {
        ok: false,
        error: eligibility.reason ?? "You are not eligible to review this competition.",
      };
    }

    // Upsert feedback
    const feedback = await FeedbackRepository.upsertFeedback({
      userId: user.id,
      eventId,
      rating,
      comment,
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${registration.id}`);
    revalidatePath("/admin/feedback");
    revalidatePath("/admin");
    revalidatePath("/admin/events");

    return {
      ok: true,
      data: feedback,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit feedback";
    return { ok: false, error: message };
  }
}
