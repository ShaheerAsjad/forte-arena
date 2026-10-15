import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { AdminRepository } from "@/features/admin/admin.repository";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CalendarDays,
  Clock,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";

const REG_STATUS_BADGES: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pending Review",
    className: "bg-amber-100 text-amber-900 border-amber-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-100 text-rose-900 border-rose-200",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: AlertCircle,
  },
};

async function AdminOverviewContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin");

  const [stats, recentRegistrations] = await Promise.all([
    AdminRepository.getAdminStats(),
    AdminRepository.getRecentRegistrations(8),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-100/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-600 bg-gold-100/80 px-2.5 py-0.5 rounded-full border border-gold-300">
              Organizer Hub
            </span>
            <span className="text-xs text-mist">• Live Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Admin Console Overview
          </h1>
          <p className="text-sm text-mist mt-1">
            Real-time status of campus tournaments, registrations, and participant approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/events/new">
            <Button variant="gold" size="md" className="shadow-md shadow-gold-500/20 font-semibold">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create Event</span>
            </Button>
          </Link>
          <Link href="/admin/events">
            <Button variant="outline" size="md">
              <span>View All Events</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Events */}
        <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex items-center gap-4 hover:border-gold-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-900 shrink-0">
            <CalendarDays className="w-6 h-6 text-navy-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-wider">
              Total Arenas
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-navy-950">
                {stats.totalEvents}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                ({stats.publishedEvents} published)
              </span>
            </div>
            <p className="text-xs text-mist mt-1">Tournaments & Competitions</p>
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card className="p-6 bg-gradient-to-br from-white to-amber-50/40 border border-amber-200 shadow-sm rounded-2xl flex items-center gap-4 hover:border-amber-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
            <Clock className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pending Approvals
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-amber-950">
                {stats.pendingRegistrations}
              </span>
              {stats.pendingRegistrations > 0 && (
                <span className="text-xs font-bold text-amber-700 animate-pulse">
                  Action required
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800/80 mt-1">Awaiting organizer review</p>
          </div>
        </Card>

        {/* Total Approved Participants */}
        <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex items-center gap-4 hover:border-gold-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Users className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-wider">
              Approved Participants
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-navy-950">
                {stats.approvedParticipants}
              </span>
              <span className="text-xs font-medium text-emerald-700">Verified</span>
            </div>
            <p className="text-xs text-mist mt-1">Confirmed competitors</p>
          </div>
        </Card>
      </div>

      {/* Recent Registrations Table Card */}
      <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-navy-50">
          <div>
            <h2 className="text-lg font-bold text-navy-950 font-heading flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <span>Recent Registrations</span>
            </h2>
            <p className="text-xs text-mist">
              Latest applications received across all categories.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="text-xs font-semibold text-navy-900 hover:text-navy-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Review registrations by event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRegistrations.length === 0 ? (
          <div className="py-12 text-center text-mist space-y-2">
            <p className="text-sm font-medium">No registrations received yet.</p>
            <p className="text-xs">Once students register for competitions, they will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-100/80 text-mist uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Participant / Team</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Submitted</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {recentRegistrations.map((reg) => {
                  const statusMeta =
                    REG_STATUS_BADGES[reg.status] || REG_STATUS_BADGES.PENDING;
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-navy-50/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-navy-950">
                          {reg.team?.name ? reg.team.name : reg.user.name}
                        </div>
                        <div className="text-[11px] text-mist flex items-center gap-1.5 mt-0.5">
                          {reg.user.rollNumber && (
                            <span className="font-mono">{reg.user.rollNumber}</span>
                          )}
                          {reg.user.department && (
                            <span>• {reg.user.department}</span>
                          )}
                          {reg.team?.members && (
                            <span>• {reg.team.members.length} members</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-navy-900 max-w-[200px] truncate">
                          {reg.event.title}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-navy-100 text-navy-800">
                          {reg.event.participationType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-mist whitespace-nowrap">
                        {new Date(reg.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/admin/events/${reg.event.id}/registrations`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-navy-50 hover:bg-navy-100 text-navy-900 transition"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-navy-100/50 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-32 bg-navy-100/50 rounded-2xl" />
            <div className="h-32 bg-navy-100/50 rounded-2xl" />
            <div className="h-32 bg-navy-100/50 rounded-2xl" />
          </div>
          <div className="h-80 bg-navy-100/50 rounded-2xl" />
        </div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
