import { z } from "zod";

export const HTTP_URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

export function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const announcementFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title cannot exceed 150 characters"),
    body: z
      .string()
      .trim()
      .min(5, "Announcement body must be at least 5 characters")
      .max(3000, "Announcement body cannot exceed 3000 characters"),
    pinned: z.boolean().default(false),
    isVisible: z.boolean().default(true),
    eventId: z.string().trim().nullable().optional(),
    linkUrl: z
      .string()
      .trim()
      .nullable()
      .optional()
      .refine(
        (val) => !val || isValidHttpUrl(val),
        "Link URL must start with http:// or https://"
      ),
    linkLabel: z
      .string()
      .trim()
      .max(50, "Link label cannot exceed 50 characters")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.linkUrl && data.linkUrl.trim()) {
        return Boolean(data.linkLabel && data.linkLabel.trim());
      }
      return true;
    },
    {
      message: "Please provide a label for the link.",
      path: ["linkLabel"],
    }
  );

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export interface AnnouncementItemCore {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  isVisible: boolean;
  eventId?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  publishedAt: Date | string;
  createdAt: Date | string;
}

/**
 * Sorts announcements:
 * 1. Pinned first (true before false)
 * 2. Newest first (createdAt / publishedAt descending)
 */
export function sortAnnouncements<T extends { pinned: boolean; createdAt: Date | string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Filters announcements to only visible ones.
 */
export function filterVisibleAnnouncements<T extends { isVisible: boolean }>(
  items: T[]
): T[] {
  return items.filter((item) => item.isVisible);
}
