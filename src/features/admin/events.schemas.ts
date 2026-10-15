import { z } from "zod";

export const eventBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title is too long"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(120, "Slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and single hyphens"
    ),
  summary: z
    .string()
    .trim()
    .min(10, "Summary must be at least 10 characters")
    .max(250, "Summary is too long"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters"),
  rules: z.string().trim().min(5, "Rules must be at least 5 characters"),
  eligibility: z
    .string()
    .trim()
    .min(3, "Eligibility information is required"),
  prizes: z.string().trim().min(3, "Prizes information is required"),
  venue: z.string().trim().min(2, "Venue is required"),
  category: z.enum([
    "TECHNICAL",
    "SPORTS",
    "CULTURAL",
    "ACADEMIC",
    "GAMING",
    "OTHER",
  ]),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "CLOSED",
    "COMPLETED",
    "CANCELLED",
  ]),
  participationType: z.enum(["INDIVIDUAL", "TEAM"]),
  minTeamSize: z
    .number()
    .int()
    .min(1, "Minimum team size must be at least 1"),
  maxTeamSize: z
    .number()
    .int()
    .min(1, "Maximum team size must be at least 1"),
  maxParticipants: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .nullable()
    .optional(),
  startsAt: z.string().min(1, "Start date and time is required"),
  endsAt: z.string().optional().nullable(),
  registrationDeadline: z.string().min(1, "Registration deadline is required"),
  posterUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional()
    .nullable(),
});

export const eventFormSchema = eventBaseSchema
  .refine(
    (data) => {
      if (data.participationType === "TEAM") {
        return data.maxTeamSize >= data.minTeamSize;
      }
      return true;
    },
    {
      message: "Max team size must be greater than or equal to min team size",
      path: ["maxTeamSize"],
    }
  )
  .refine(
    (data) => {
      if (!data.startsAt || !data.registrationDeadline) return true;
      const start = new Date(data.startsAt).getTime();
      const deadline = new Date(data.registrationDeadline).getTime();
      return deadline <= start;
    },
    {
      message: "Registration deadline cannot be after event start time",
      path: ["registrationDeadline"],
    }
  );

export type EventFormValues = z.infer<typeof eventBaseSchema>;
