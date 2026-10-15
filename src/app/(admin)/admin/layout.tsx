import { requireRole } from "@/lib/session";
import { AdminTopNav } from "@/components/layout/AdminTopNav";

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

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col font-sans">
      <AdminTopNav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
