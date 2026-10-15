import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { EventForm } from "@/features/admin/events/EventForm";
import { ArrowLeft, Loader2 } from "lucide-react";

export const metadata = {
  title: "Edit Event | Admin Console",
};

async function EditEventContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["ORGANIZER", "ADMIN"], `/login?next=/admin/events/${id}/edit`);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    notFound();
  }

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
            Edit Event: {event.title}
          </h1>
          <p className="text-xs text-mist mt-0.5">
            Modify event specifications, schedule, limits, or poster artwork.
          </p>
        </div>
      </div>

      <EventForm initialData={event} isEdit />
    </div>
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex items-center justify-center text-mist gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
          <span className="text-sm">Loading event editor...</span>
        </div>
      }
    >
      <EditEventContent params={params} />
    </Suspense>
  );
}
