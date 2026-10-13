import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/client";

export async function getSession() {
  const reqHeaders = await headers();
  return auth.api.getSession({
    headers: reqHeaders,
  });
}

export async function requireUser(redirectTo?: string) {
  const session = await getSession();
  if (!session?.user) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    throw new UnauthorizedError("You must be logged in to access this page");
  }
  return session.user;
}

export async function requireRole(
  allowedRoles: Role | Role[],
  redirectTo?: string
) {
  const user = await requireUser(redirectTo);
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userRole = (user as unknown as { role?: Role }).role || "STUDENT";

  if (!roles.includes(userRole as Role)) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    throw new ForbiddenError(
      `Access denied: Requires role ${roles.join(" or ")}`
    );
  }

  return user;
}
