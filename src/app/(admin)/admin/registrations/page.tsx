import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  RegistrationsReviewCards,
  type RegistrationReviewItem,
} from "@/features/admin/registrations/RegistrationsReviewCards";
import { Button } from "@/components/ui/Button";
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Registrations Hub | Organizer Admin Console",
  description: "Cross-event participant applications, team rosters, and review approvals.",
};

async function CrossEventRegistrationsContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/registrations");

  // Fetch all competitions and all applications across events
  const [events, registrations] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        maxParticipants: true,
      },
    }),
    prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            participationType: true,
            maxParticipants: true,
          },
        },
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
                attendedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;
  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-100/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-600 bg-gold-100/80 px-2.5 py-0.5 rounded-full border border-gold-300">
              CROSS-EVENT APPLICANTS
            </span>
            <span className="text-xs text-mist font-medium">
              • {events.length} Active Competitions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Registrations Hub
          </h1>
          <p className="text-xs sm:text-sm text-mist mt-0.5">
            Cross-event review queue for solo students and team rosters across all campus competitions.
          </p>
        </div>

        <Link href="/admin/events">
          <Button variant="outline" size="sm" className="font-semibold shadow-xs">
            <span>View Events</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Cross-Event Summary Cards */}
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
              Approved Applications
            </p>
            <p className="text-xl font-black font-heading text-emerald-700">
              {approvedCount}
            </p>
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

      {/* Review Cards Component with Cross-Event Filter */}
      <RegistrationsReviewCards
        registrations={registrations as unknown as RegistrationReviewItem[]}
        events={events}
        showEventFilter={true}
        approvedCount={approvedCount}
      />
    </div>
  );
}

export default function AdminRegistrationsPage() {
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
          <div className="h-96 bg-navy-100/50 rounded-3xl w-full" />
        </div>
      }
    >
      <CrossEventRegistrationsContent />
    </Suspense>
  );
}
