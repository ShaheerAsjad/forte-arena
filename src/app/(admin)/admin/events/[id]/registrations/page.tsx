import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { RegistrationsReviewCards, type RegistrationReviewItem } from "@/features/admin/registrations/RegistrationsReviewCards";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Download,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "Review Registrations | Admin Console",
};

interface RegistrationsPageProps {
  params: Promise<{ id: string }>;
}

async function RegistrationsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["ORGANIZER", "ADMIN"], `/login?next=/admin/events/${id}/registrations`);

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      status: true,
      participationType: true,
      maxParticipants: true,
      startsAt: true,
      registrationDeadline: true,
      venue: true,
    },
  });

  if (!event) {
    notFound();
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          rollNumber: true,
          department: true,
          phone: true,
        },
      },
      team: {
        include: {
          members: {
            select: {
              id: true,
              fullName: true,
              rollNumber: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;
  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  const registrationsWithEvent = registrations.map((r) => ({
    ...r,
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      category: event.category,
      participationType: event.participationType,
      maxParticipants: event.maxParticipants,
    },
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-100/60">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/events"
            className="p-2 rounded-xl border border-navy-100 hover:bg-navy-50 text-mist hover:text-navy-900 transition mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-600 bg-gold-100/80 px-2.5 py-0.5 rounded-full border border-gold-300">
                {event.category}
              </span>
              <span className="text-xs text-mist">• {event.participationType}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-mist mt-0.5">
              Review and approve participant applications for this competition.
            </p>
          </div>
        </div>

        {/* CSV Export & Quick Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <a
            href={`/api/admin/events/${event.id}/export`}
            download
            className="inline-flex items-center"
          >
            <Button variant="outline" size="md" className="font-semibold shadow-xs">
              <Download className="w-4 h-4 mr-1.5 text-navy-700" />
              <span>Export CSV</span>
            </Button>
          </a>
          <Link href={`/admin/events/${event.id}/edit`}>
            <Button variant="ghost" size="md">
              Edit Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Capacity & Turnout Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-navy-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-800 shrink-0">
            <Users className="w-5 h-5 text-navy-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Total Applications
            </p>
            <p className="text-xl font-black font-heading text-navy-950">
              {registrations.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-navy-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Approved Competitors
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-heading text-navy-950">
                {approvedCount}
              </span>
              {event.maxParticipants && (
                <span className="text-xs text-mist font-semibold">
                  / {event.maxParticipants} capacity
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 bg-amber-50/30 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <Clock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Pending Approvals
            </p>
            <p className="text-xl font-black font-heading text-amber-950">
              {pendingCount}
            </p>
          </div>
        </div>
      </div>

      {/* Review Cards Component */}
      <RegistrationsReviewCards
        registrations={registrationsWithEvent as unknown as RegistrationReviewItem[]}
        currentEventId={event.id}
        maxParticipants={event.maxParticipants}
        approvedCount={approvedCount}
      />
    </div>
  );
}

export default function AdminEventRegistrationsPage({ params }: RegistrationsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-navy-100/50 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-20 bg-navy-100/50 rounded-2xl" />
            <div className="h-20 bg-navy-100/50 rounded-2xl" />
            <div className="h-20 bg-navy-100/50 rounded-2xl" />
          </div>
          <div className="h-96 bg-navy-100/50 rounded-2xl w-full" />
        </div>
      }
    >
      <RegistrationsContent params={params} />
    </Suspense>
  );
}
