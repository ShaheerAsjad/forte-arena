import { Suspense } from "react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AnnouncementsService } from "@/features/announcements/services/announcements.service";
import { AdminAnnouncementsManager } from "@/features/admin/announcements/AdminAnnouncementsManager";

export const metadata = {
  title: "Announcements & Bulletins | Organizer Console",
  description: "Manage campus competition notices, rule updates, and urgent alerts.",
};

function AnnouncementsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-white border border-navy-100 rounded-3xl" />
      <div className="h-14 bg-white border border-navy-100 rounded-2xl" />
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-36 bg-white border border-navy-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function AdminAnnouncementsContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/announcements");

  const [announcements, events] = await Promise.all([
    AnnouncementsService.getAllAnnouncementsAdmin(),
    prisma.event.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return (
    <AdminAnnouncementsManager
      initialAnnouncements={announcements}
      events={events}
    />
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <Suspense fallback={<AnnouncementsLoadingSkeleton />}>
      <AdminAnnouncementsContent />
    </Suspense>
  );
}
