"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveRegistrationAction,
  rejectRegistrationAction,
} from "../registrations.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Users,
  Loader2,
  X,
} from "lucide-react";

interface RegistrationItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  attemptCount: number;
  withdrawCount: number;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    email: string;
    rollNumber: string | null;
    department: string | null;
    phone: string | null;
  };
  team: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      fullName: string;
      rollNumber: string;
      email?: string | null;
      phone?: string | null;
    }>;
  } | null;
}

const STATUS_BADGES: Record<
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

export function RegistrationsReviewTable({
  registrations,
  maxParticipants,
  approvedCount,
}: {
  registrations: RegistrationItem[];
  eventId?: string;
  maxParticipants: number | null;
  approvedCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeRegId, setActiveRegId] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Reject Modal state
  const [rejectingReg, setRejectingReg] = useState<RegistrationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (regId: string) => {
    setActiveRegId(regId);
    startTransition(async () => {
      try {
        const res = await approveRegistrationAction(regId);
        if (res.ok) {
          toast.success("Registration approved successfully!");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Failed to approve registration.");
      } finally {
        setActiveRegId(null);
      }
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectingReg) return;
    if (rejectReason.trim().length < 3) {
      toast.error("Please enter a valid rejection reason (minimum 3 characters).");
      return;
    }

    setActiveRegId(rejectingReg.id);
    startTransition(async () => {
      try {
        const res = await rejectRegistrationAction(rejectingReg.id, rejectReason);
        if (res.ok) {
          toast.success("Registration rejected. Reason saved.");
          setRejectingReg(null);
          setRejectReason("");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Failed to reject registration.");
      } finally {
        setActiveRegId(null);
      }
    });
  };

  // Filter registrations client-side
  const filtered = registrations.filter((reg) => {
    if (statusFilter !== "ALL" && reg.status !== statusFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const studentName = reg.user.name.toLowerCase();
      const roll = (reg.user.rollNumber || "").toLowerCase();
      const email = reg.user.email.toLowerCase();
      const teamName = (reg.team?.name || "").toLowerCase();
      const memberMatch =
        reg.team?.members.some(
          (m) =>
            m.fullName.toLowerCase().includes(q) ||
            m.rollNumber.toLowerCase().includes(q)
        ) ?? false;

      return (
        studentName.includes(q) ||
        roll.includes(q) ||
        email.includes(q) ||
        teamName.includes(q) ||
        memberMatch
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Status Filter Chips */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-navy-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, roll number, or team..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
          />
        </div>

        {/* Filter Tabs & Capacity */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "PENDING", "APPROVED", "REJECTED", "WITHDRAWN"].map((status) => {
              const isSelected = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-navy-900 text-ivory shadow-xs"
                      : "bg-navy-50/70 text-mist hover:text-navy-900 hover:bg-navy-100"
                  }`}
                >
                  {status === "ALL" ? "All Statuses" : status}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-semibold text-navy-800 bg-navy-50/80 px-2.5 py-1.5 rounded-xl border border-navy-100/80 whitespace-nowrap">
            Capacity: <span className="text-navy-950 font-bold">{approvedCount}</span> /{" "}
            {maxParticipants !== null ? maxParticipants : "Unlimited"}
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-mist space-y-2">
            <Users className="w-8 h-8 mx-auto text-navy-200" />
            <p className="text-sm font-semibold text-navy-950">
              No matching registrations
            </p>
            <p className="text-xs">
              {search || statusFilter !== "ALL"
                ? "No applications found matching your active filters."
                : "No registrations have been submitted for this event yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-100/80 text-mist uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Participant / Team</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Attempts</th>
                  <th className="py-3 px-3">Submitted</th>
                  <th className="py-3 px-3">Notes / Reason</th>
                  <th className="py-3 px-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filtered.map((reg) => {
                  const statusMeta =
                    STATUS_BADGES[reg.status] || STATUS_BADGES.PENDING;
                  const StatusIcon = statusMeta.icon;
                  const isOperating = isPending && activeRegId === reg.id;

                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-navy-50/50 transition-colors"
                    >
                      {/* Name & Details */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-navy-950 text-sm">
                          {reg.team?.name ? reg.team.name : reg.user.name}
                        </div>
                        <div className="text-[11px] text-mist flex items-center gap-1.5 mt-0.5">
                          {reg.user.rollNumber && (
                            <span className="font-mono font-semibold text-navy-800">
                              {reg.user.rollNumber}
                            </span>
                          )}
                          {reg.user.department && (
                            <span>• {reg.user.department}</span>
                          )}
                        </div>

                        {/* If team, list members */}
                        {reg.team && reg.team.members.length > 0 && (
                          <div className="mt-2 pl-2 border-l-2 border-gold-300 space-y-0.5 text-[11px] text-ink/80">
                            <p className="font-bold text-[10px] uppercase tracking-wider text-mist">
                              Team Roster ({reg.team.members.length} members):
                            </p>
                            {reg.team.members.map((m) => (
                              <div key={m.id} className="flex items-center gap-2">
                                <span className="font-medium text-navy-950">
                                  {m.fullName}
                                </span>
                                <span className="font-mono text-mist">
                                  [{m.rollNumber}]
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-mist">
                        <div className="text-navy-900">{reg.user.email}</div>
                        {reg.user.phone && (
                          <div className="text-[11px] text-mist font-mono mt-0.5">
                            {reg.user.phone}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Attempt Count */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-mist">
                        <span className="font-semibold text-navy-900">
                          {reg.attemptCount} of 2
                        </span>
                        {reg.withdrawCount > 0 && (
                          <div className="text-[10px] text-amber-700">
                            (withdrawn {reg.withdrawCount}x)
                          </div>
                        )}
                      </td>

                      {/* Submitted date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-mist">
                        {new Date(reg.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Notes / Reason */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        {reg.notes || reg.rejectionReason ? (
                          <div className="text-[11px] text-danger bg-danger-bg p-2 rounded-lg border border-danger/20 line-clamp-2">
                            {reg.notes || reg.rejectionReason}
                          </div>
                        ) : (
                          <span className="text-mist text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {reg.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="gold"
                              size="sm"
                              disabled={isOperating}
                              onClick={() => handleApprove(reg.id)}
                              className="font-bold shadow-xs text-xs py-1"
                            >
                              {isOperating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-800" />
                              )}
                              <span>Approve</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isOperating}
                              onClick={() => {
                                setRejectingReg(reg);
                                setRejectReason("");
                              }}
                              className="border-danger/30 text-danger hover:bg-danger-bg text-xs py-1"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : reg.status === "APPROVED" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingReg(reg);
                                setRejectReason("");
                              }}
                              className="text-[11px] text-mist hover:text-danger underline ml-2 cursor-pointer"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : reg.status === "REJECTED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isOperating}
                            onClick={() => handleApprove(reg.id)}
                            className="text-xs py-1"
                          >
                            <span>Re-approve</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-mist italic">Withdrawn</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reject Reason Modal */}
      {rejectingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-navy-100 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-navy-100">
              <h3 className="font-heading text-lg font-bold text-navy-950 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-danger" />
                <span>Reject Registration</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingReg(null)}
                className="p-1 rounded-lg text-mist hover:text-navy-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-mist">
                Please provide a clear reason for rejecting the registration of{" "}
                <strong className="text-navy-950">
                  {rejectingReg.team?.name || rejectingReg.user.name}
                </strong>
                . This reason will be stored in notes and communicated to the student.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Ineligible department, incomplete team roster, or missing student ID verification."
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-danger/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-navy-50">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setRejectingReg(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                disabled={isPending || rejectReason.trim().length < 3}
                onClick={handleRejectSubmit}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
