import type { Role } from "@/generated/prisma/client";

export interface UserLike {
  id: string;
  role?: Role | string;
}

export interface RegistrationLike {
  id: string;
  userId: string;
}

export interface EventLike {
  id: string;
  createdById?: string;
}

export function isAdmin(user?: UserLike | null): boolean {
  return user?.role === "ADMIN";
}

export function isOrganizer(user?: UserLike | null): boolean {
  return user?.role === "ORGANIZER" || user?.role === "ADMIN";
}

export function canManageEvent(user?: UserLike | null): boolean {
  return isOrganizer(user);
}

export function canViewRegistration(
  user?: UserLike | null,
  registration?: RegistrationLike | null
): boolean {
  if (!user || !registration) return false;
  return isOrganizer(user) || registration.userId === user.id;
}

export function canModifyRegistration(
  user?: UserLike | null,
  registration?: RegistrationLike | null
): boolean {
  if (!user || !registration) return false;
  return registration.userId === user.id || isOrganizer(user);
}

export function canReviewRegistrations(user?: UserLike | null): boolean {
  return isOrganizer(user);
}

export function canPublishResults(user?: UserLike | null): boolean {
  return isOrganizer(user);
}

export function canManageAnnouncements(user?: UserLike | null): boolean {
  return isOrganizer(user);
}
