import { requireRole } from "@/lib/session";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata = {
  title: "Organizer Admin Console | Forté Arena",
  description: "Manage campus competitions, review participant registrations, and publish results.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce ORGANIZER/ADMIN role server-side on the entire admin area
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin");

  return <AdminShell>{children}</AdminShell>;
}
