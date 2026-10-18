import { requireRole } from "@/lib/session";
import { AttendanceService } from "@/features/attendance/services/attendance.service";
import { ScanConsoleClient } from "./ScanConsoleClient";

export const metadata = {
  title: "Scan Entry Pass | Organizer Console",
  description: "Live camera scanner and attendance check-in for event participants.",
};

export default async function AdminScanPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/scan");

  const rawEvents = await AttendanceService.getEventsWithApprovedRegistrations();
  const { eventId } = await searchParams;

  const events = rawEvents.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    venue: e.venue,
    startsAt: e.startsAt,
    status: e.status,
    approvedCount: e.approvedPeopleCount,
  }));

  const activeEventId = eventId || events[0]?.id || "";
  const initialStats = activeEventId
    ? await AttendanceService.getEventStats(activeEventId)
    : { totalApproved: 0, totalAttended: 0, recentCheckIns: [] };

  return (
    <div className="w-full">
      <ScanConsoleClient
        events={events}
        initialEventId={activeEventId}
        initialStats={initialStats}
      />
    </div>
  );
}
