import { requireRole } from "@/lib/session";
import { AttendanceService } from "@/features/attendance/services/attendance.service";
import { AttendanceConsoleClient } from "./AttendanceConsoleClient";

export const metadata = {
  title: "Attendance Management | Organizer Console",
  description: "View event attendance breakdown, participant lists, manual check-in, and CSV export.",
};

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/attendance");

  const rawEvents = await AttendanceService.getEventsWithAnyRegistrations();
  const { eventId } = await searchParams;

  const events = rawEvents.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    venue: e.venue,
    startsAt: e.startsAt,
    status: e.status,
  }));

  const isValidUrlEvent = eventId ? events.some((e) => e.id === eventId) : false;
  const activeEventId = isValidUrlEvent ? eventId! : events[0]?.id || "";

  const [initialStats, initialParticipants] = await Promise.all([
    activeEventId
      ? AttendanceService.getEventDetailedStats(activeEventId)
      : {
          applications: { total: 0, pending: 0, approved: 0, rejected: 0, withdrawn: 0 },
          approvedPeople: 0,
          presentPeople: 0,
          presentSplit: { qr: 0, manual: 0, earlier: 0 },
          notYetPresent: 0,
          percentage: 0,
        },
    activeEventId
      ? AttendanceService.getEventAttendanceParticipants(activeEventId)
      : [],
  ]);

  return (
    <div className="w-full">
      <AttendanceConsoleClient
        key={activeEventId}
        events={events}
        initialEventId={activeEventId}
        initialStats={initialStats}
        initialParticipants={initialParticipants}
      />
    </div>
  );
}
