import { requireRole } from "@/lib/session";
import { EventForm } from "@/features/admin/events/EventForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Create Event | Admin Console",
};

export default async function NewEventPage() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/events/new");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/events"
          className="p-2 rounded-xl border border-navy-100 hover:bg-navy-50 text-mist hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 font-heading">
            Create New Event
          </h1>
          <p className="text-xs text-mist mt-0.5">
            Configure rules, eligibility, schedule, and capacity for this competition.
          </p>
        </div>
      </div>

      <EventForm />
    </div>
  );
}
