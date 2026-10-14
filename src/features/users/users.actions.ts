"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AppError } from "@/lib/errors";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const profileSchema = z.object({
  rollNumber: z
    .string()
    .min(2, "Roll number must be at least 2 characters")
    .max(30, "Roll number is too long")
    .regex(/^[A-Za-z0-9\-\/]+$/, "Roll number contains invalid characters"),
  department: z
    .string()
    .min(2, "Department must be at least 2 characters")
    .max(100, "Department name is too long"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number is too long")
    .regex(/^[\+\d\s\-()]+$/, "Invalid phone number format"),
});

export async function updateProfile(
  payload: z.infer<typeof profileSchema>
): Promise<ActionResult<{ userId: string }>> {
  try {
    const user = await requireUser();

    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { ok: false, error: firstError?.message ?? "Invalid input" };
    }
    const { rollNumber, department, phone } = parsed.data;

    await prisma.user.update({
      where: { id: user.id },
      data: { rollNumber, department, phone },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true, data: { userId: user.id } };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "Failed to update profile." };
  }
}
