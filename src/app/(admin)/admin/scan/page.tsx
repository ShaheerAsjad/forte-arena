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

  const isValidUrlEvent = eventId ? events.some((e) => e.id === eventId) : false;
  const activeEventId = isValidUrlEvent ? eventId! : events[0]?.id || "";
  const selectedEvent = events.find((e) => e.id === activeEventId) || events[0];

  // Defer exact live check-in stats to client background fetch (getEventAttendanceCountsAction).
  // Immediately render with approvedCount from event list so the camera gate mounts with zero DB lag.
  const initialCounts = {
    totalApproved: selectedEvent?.approvedCount || 0,
    totalAttended: 0,
  };

  return (
    <div className="w-full">
      <ScanConsoleClient
        events={events}
        initialEventId={activeEventId}
        initialCounts={initialCounts}
      />
    </div>
  );
}
