import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ResultsRepository } from "@/features/results/repositories/results.repository";
import { formatEventDate } from "@/lib/dates";
import {
  Trophy,
  ArrowRight,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  FileQuestion,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Tournament Results | Organizer Console",
  description: "Publish tournament results, assign podium standings, and distribute awards.",
};

const STATUS_BADGE_CONFIG = {
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    icon: CheckCircle2,
  },
  DRAFT: {
    label: "Draft",
    className: "bg-amber-100 text-amber-900 border-amber-200",
    icon: Sparkles,
  },
  NO_RESULTS: {
    label: "No Results",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileQuestion,
  },
};

async function AdminResultsListContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/results");

  const events = await ResultsRepository.getAdminEligibleEvents();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-100/70">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-600 bg-gold-100/90 border border-gold-300 px-2.5 py-0.5 rounded-full">
              Results & Standings
            </span>
            <span className="text-xs text-mist font-medium">
              • Completed & Past Events
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Tournament Results Manager
          </h1>
          <p className="text-sm text-mist mt-1 max-w-2xl">
            Assign podium standings, record scores, and publish public results for campus competitions.
          </p>
        </div>

        <Link href="/admin/events">
          <Button variant="outline" size="sm" className="font-semibold shadow-xs">
            <span>View All Arenas</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Events List / Table */}
      {events.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-white border border-navy-100 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-navy-50 flex items-center justify-center text-gold-500 mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="font-heading text-lg font-bold text-navy-950">
            No Completed Events Found
          </h3>
          <p className="text-xs sm:text-sm text-mist max-w-md mx-auto">
            Results can be managed once events reach their completion or end date. Check the Events tab to update event statuses.
          </p>
          <div className="pt-2">
            <Link href="/admin/events">
              <Button variant="primary" size="sm">
                Go to Events Console
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((ev) => {
            const badge = STATUS_BADGE_CONFIG[ev.statusBadge];
            const BadgeIcon = badge.icon;

            return (
              <Card
                key={ev.id}
                className="p-5 sm:p-6 bg-white border border-navy-100 hover:border-gold-300 transition-colors shadow-xs rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Event info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-navy-900 bg-navy-50 px-2 py-0.5 rounded-md border border-navy-100">
                      {ev.category}
                    </span>

                    <span className="text-[11px] font-medium text-mist">
                      {ev.participationType === "TEAM" ? "Team Event" : "Solo Event"}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-extrabold text-navy-950 truncate">
                    {ev.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-mist pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-500" />
                      <span>{formatEventDate(ev.startsAt)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold-500" />
                      <span>{ev.venue}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-navy-700" />
                      <span>{ev.approvedCount} Approved Participants</span>
                    </span>
                  </div>
                </div>

                {/* Status counts & Action */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-navy-50">
                  <div className="text-right">
                    <div className="font-heading text-lg font-black text-navy-950">
                      {ev.resultCount}
                    </div>
                    <span className="text-[11px] font-medium text-mist block">
                      {ev.resultCount === 1 ? "Result Entered" : "Results Entered"}
                    </span>
                    <span className="text-[11px] font-semibold text-gold-700 block mt-0.5">
                      {ev.certificatesUploadedCount} of {ev.resultCount} certificates uploaded
                    </span>
                  </div>

                  <Link href={`/admin/results/${ev.id}`}>
                    <Button variant="gold" size="sm" className="font-semibold shadow-xs">
                      <Trophy className="w-4 h-4 mr-1.5" />
                      <span>Manage Results</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-navy-100/50 rounded-2xl w-full" />
          <div className="space-y-4">
            <div className="h-28 bg-navy-100/40 rounded-2xl w-full" />
            <div className="h-28 bg-navy-100/40 rounded-2xl w-full" />
            <div className="h-28 bg-navy-100/40 rounded-2xl w-full" />
          </div>
        </div>
      }
    >
      <AdminResultsListContent />
    </Suspense>
  );
}
