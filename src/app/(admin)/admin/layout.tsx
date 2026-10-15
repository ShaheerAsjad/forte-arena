import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = {
  title: "Organizer Admin Console | Forté Arena",
  description: "Manage campus competitions, review participant registrations, and publish results.",
};

function AdminContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 pb-2 border-b border-navy-100/60">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl w-full" />
    </div>
  );
}

async function AdminGuard({ children }: { children: React.ReactNode }) {
  // Enforce ORGANIZER/ADMIN role server-side on the entire admin area
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin");
  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      <Suspense fallback={<AdminContentSkeleton />}>
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
    </AdminShell>
  );
}

