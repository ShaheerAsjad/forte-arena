"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  approveRegistrationAction,
  rejectRegistrationAction,
} from "@/features/admin/registrations.actions";
import { undoCheckInAction } from "@/features/attendance/attendance.actions";
import { formatTime24 } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
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
  Mail,
  Phone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  RotateCcw,
} from "lucide-react";

export interface RegistrationReviewItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  checkInToken?: string | null;
  attendedAt?: Date | string | null;
  attendedById?: string | null;
  attemptCount: number;
  withdrawCount: number;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: Date | string;
  event: {
    id: string;
    title: string;
    slug?: string;
    category?: string;
    participationType?: string;
    maxParticipants?: number | null;
  };
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
      attendedAt?: Date | string | null;
    }>;
  } | null;
}

export interface EventOption {
  id: string;
  title: string;
  category?: string;
  maxParticipants?: number | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; pillClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pending Review",
    pillClass: "bg-amber-100/90 text-amber-900 border-amber-300",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    pillClass: "bg-emerald-100/90 text-emerald-900 border-emerald-300",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    pillClass: "bg-rose-100/90 text-rose-900 border-rose-300",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    pillClass: "bg-slate-100 text-slate-700 border-slate-300",
    icon: AlertCircle,
  },
};

export function RegistrationsReviewCards({
  registrations,
  events,
  currentEventId,
  maxParticipants,
  approvedCount: initialApprovedCount,
  showEventFilter = false,
}: {
  registrations: RegistrationReviewItem[];
  events?: EventOption[];
  currentEventId?: string;
  maxParticipants?: number | null;
  approvedCount?: number;
  showEventFilter?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeRegId, setActiveRegId] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string>(
    currentEventId || "ALL"
  );

  // UI state for team roster expansion and copy buttons
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingReg, setRejectingReg] = useState<RegistrationReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Undo check-in modal state
  const [undoTarget, setUndoTarget] = useState<RegistrationReviewItem | null>(null);
  const [isUndoing, startUndoTransition] = useTransition();

  const handleUndoSubmit = () => {
    if (!undoTarget) return;

    startUndoTransition(async () => {
      try {
        const res = await undoCheckInAction({ registrationId: undoTarget.id });
        if (res.ok) {
          toast.success(`Check-in undone for ${undoTarget.user.name}`);
          setUndoTarget(null);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Failed to undo check-in.");
      }
    });
  };

  const handleCopy = (text: string, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 1500);
  };

  const toggleRoster = (regId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [regId]: !prev[regId],
    }));
  };

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
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      toast.error("Please enter a valid rejection reason (minimum 3 characters).");
      return;
    }

    setActiveRegId(rejectingReg.id);
    startTransition(async () => {
      try {
        const res = await rejectRegistrationAction(rejectingReg.id, trimmed);
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

  // Base list filtered by event if event filter is active
  const eventFiltered = useMemo(() => {
    if (selectedEventId === "ALL") return registrations;
    return registrations.filter((r) => r.event.id === selectedEventId);
  }, [registrations, selectedEventId]);

  // Live counts for status segmented bar
  const counts = useMemo(() => {
    return {
      ALL: eventFiltered.length,
      PENDING: eventFiltered.filter((r) => r.status === "PENDING").length,
      APPROVED: eventFiltered.filter((r) => r.status === "APPROVED").length,
      ATTENDED: eventFiltered.filter((r) => {
        if (r.team?.members && r.team.members.length > 0) {
          return r.team.members.some((m) => Boolean(m.attendedAt));
        }
        return Boolean(r.attendedAt);
      }).length,
      REJECTED: eventFiltered.filter((r) => r.status === "REJECTED").length,
      WITHDRAWN: eventFiltered.filter((r) => r.status === "WITHDRAWN").length,
    };
  }, [eventFiltered]);

  // Capacity calculations
  const effectiveMaxCapacity = useMemo(() => {
    if (maxParticipants !== undefined) return maxParticipants;
    if (selectedEventId !== "ALL" && events) {
      const ev = events.find((e) => e.id === selectedEventId);
      return ev?.maxParticipants ?? null;
    }
    return null;
  }, [maxParticipants, selectedEventId, events]);

  const effectiveApprovedCount = useMemo(() => {
    if (initialApprovedCount !== undefined && selectedEventId === (currentEventId || "ALL")) {
      return initialApprovedCount;
    }
    return counts.APPROVED;
  }, [initialApprovedCount, selectedEventId, currentEventId, counts.APPROVED]);

  const capacityPercentage = useMemo(() => {
    if (!effectiveMaxCapacity || effectiveMaxCapacity <= 0) return null;
    return Math.min(
      100,
      Math.round((effectiveApprovedCount / effectiveMaxCapacity) * 100)
    );
  }, [effectiveApprovedCount, effectiveMaxCapacity]);

  // Client-side search and status filter
  const filteredRegistrations = useMemo(() => {
    return eventFiltered.filter((reg) => {
      // 1. Status Filter
      if (statusFilter === "ATTENDED") {
        if (reg.team?.members && reg.team.members.length > 0) {
          if (!reg.team.members.some((m) => Boolean(m.attendedAt))) return false;
        } else if (!reg.attendedAt) {
          return false;
        }
      } else if (statusFilter !== "ALL" && reg.status !== statusFilter) {
        return false;
      }

      // 2. Search Query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const userName = reg.user.name.toLowerCase();
        const userRoll = (reg.user.rollNumber || "").toLowerCase();
        const userEmail = reg.user.email.toLowerCase();
        const userDept = (reg.user.department || "").toLowerCase();
        const userPhone = (reg.user.phone || "").toLowerCase();
        const teamName = (reg.team?.name || "").toLowerCase();
        const eventTitle = (reg.event?.title || "").toLowerCase();

        const memberMatch =
          reg.team?.members.some(
            (m) =>
              m.fullName.toLowerCase().includes(q) ||
              m.rollNumber.toLowerCase().includes(q) ||
              (m.email && m.email.toLowerCase().includes(q))
          ) ?? false;

        return (
          userName.includes(q) ||
          userRoll.includes(q) ||
          userEmail.includes(q) ||
          userDept.includes(q) ||
          userPhone.includes(q) ||
          teamName.includes(q) ||
          eventTitle.includes(q) ||
          memberMatch
        );
      }

      return true;
    });
  }, [eventFiltered, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* 1. Filter, Search, and Event Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-navy-100 shadow-xs space-y-4">
        {/* Top controls: Search + Event Selector (if cross-event) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, roll number, team, email, or member..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white placeholder:text-mist/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-mist hover:text-navy-950 transition"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter (when cross-event hub is active) */}
          {showEventFilter && events && events.length > 0 && (
            <div className="w-full sm:w-64 shrink-0">
              <Select
                value={selectedEventId}
                onChange={(val) => setSelectedEventId(val || "ALL")}
                options={[
                  {
                    value: "ALL",
                    label: `All Competitions (${registrations.length})`,
                  },
                  ...events.map((ev) => ({
                    value: ev.id,
                    label: ev.title,
                  })),
                ]}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Status Segmented Bar + Live Counts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-navy-50">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "PENDING", label: "Pending" },
                { key: "APPROVED", label: "Approved" },
                { key: "ATTENDED", label: "Attended" },
                { key: "REJECTED", label: "Rejected" },
                { key: "WITHDRAWN", label: "Withdrawn" },
              ] as const
            ).map((seg) => {
              const isSelected = statusFilter === seg.key;
              const count = counts[seg.key];

              return (
                <button
                  key={seg.key}
                  type="button"
                  onClick={() => setStatusFilter(seg.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-navy-900 text-ivory shadow-xs"
                      : "bg-navy-50/70 text-mist hover:text-navy-950 hover:bg-navy-100/80"
                  }`}
                >
                  <span>{seg.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-gold-500 text-navy-950"
                        : "bg-navy-200/60 text-navy-900"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Capacity Indicator Pill */}
          <div className="text-[11px] font-semibold text-navy-800 bg-navy-50/90 px-3 py-1.5 rounded-xl border border-navy-100 flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Users className="w-3.5 h-3.5 text-navy-700" />
            <span>
              Capacity:{" "}
              <strong className="text-navy-950 font-bold">
                {effectiveApprovedCount}
              </strong>{" "}
              /{" "}
              {effectiveMaxCapacity !== null ? effectiveMaxCapacity : "Unlimited"}
            </span>
          </div>
        </div>

        {/* Capacity Progress Bar (rendered when capacity is limited) */}
        {effectiveMaxCapacity !== null && capacityPercentage !== null && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-mist">
              <span>Roster Capacity Fill</span>
              <span
                className={
                  capacityPercentage >= 100
                    ? "text-rose-700 font-bold"
                    : capacityPercentage >= 80
                    ? "text-amber-800 font-bold"
                    : "text-emerald-700 font-bold"
                }
              >
                {effectiveApprovedCount} of {effectiveMaxCapacity} filled ({capacityPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-navy-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityPercentage >= 100
                    ? "bg-rose-500"
                    : capacityPercentage >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${capacityPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Review Card List */}
      {filteredRegistrations.length === 0 ? (
        <Card className="p-12 sm:p-16 bg-white border border-navy-100 shadow-sm rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-300 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base sm:text-lg text-navy-950">
            No matching applications found
          </h3>
          <p className="text-xs sm:text-sm text-mist max-w-sm mx-auto">
            {search || statusFilter !== "ALL" || selectedEventId !== "ALL"
              ? "Try adjusting or clearing your active search query and status filters."
              : "No student applications have been submitted yet for this competition."}
          </p>
          {(search || statusFilter !== "ALL" || selectedEventId !== "ALL") && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setSelectedEventId(currentEventId || "ALL");
                }}
                className="text-xs font-semibold"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((reg) => {
            const isTeam = Boolean(reg.team && reg.team.name);
            const titleName = isTeam ? reg.team!.name : reg.user.name;
            const avatarInitial = titleName.charAt(0).toUpperCase() || "A";

            const statusMeta =
              STATUS_CONFIG[reg.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusMeta.icon;
            const isOperating = isPending && activeRegId === reg.id;

            const members = reg.team?.members || [];
            const attendedMembersCount = isTeam
              ? members.filter((m) => Boolean(m.attendedAt)).length
              : reg.attendedAt ? 1 : 0;
            const isRosterExpanded = Boolean(expandedCards[reg.id]);
            const visibleMembers = isRosterExpanded
              ? members
              : members.slice(0, 3);
            const hiddenMembersCount = Math.max(0, members.length - 3);

            // Rejection reason check: Show notes ONLY when reject reason exists!
            const rejectNote = (reg.rejectionReason || reg.notes || "").trim();
            const showRejectNote = rejectNote.length > 0;

            const formattedDate = new Date(reg.createdAt).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <Card
                key={reg.id}
                className="p-4 sm:p-5 lg:p-6 bg-white border border-navy-100 hover:border-navy-200 shadow-sm rounded-2xl sm:rounded-3xl transition-all duration-150 space-y-4"
              >
                {/* Card Header: Avatar Initial, Name, Event Badge, Status Pill, Attempt Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Avatar Initial */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 text-gold-400 font-heading font-black text-lg flex items-center justify-center shrink-0 shadow-xs border border-navy-700">
                      {avatarInitial}
                    </div>

                    {/* Participant / Team Name & Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-heading font-bold text-base sm:text-lg text-navy-950 break-words">
                          {titleName}
                        </h3>

                        {isTeam ? (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-800 bg-navy-100/90 px-2 py-0.5 rounded-full border border-navy-200">
                            Team ({members.length} Members)
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-mist bg-navy-50 px-2 py-0.5 rounded-full border border-navy-100">
                            Solo Participant
                          </span>
                        )}
                      </div>

                      {/* Leader or Roll Info */}
                      <p className="text-xs text-mist font-medium flex flex-wrap items-center gap-1.5">
                        {isTeam ? (
                          <span>
                            Leader:{" "}
                            <strong className="text-navy-900 font-semibold">
                              {reg.user.name}
                            </strong>
                            {reg.user.rollNumber && ` [${reg.user.rollNumber}]`}
                          </span>
                        ) : (
                          <>
                            {reg.user.rollNumber && (
                              <span className="font-mono text-navy-900 font-semibold">
                                {reg.user.rollNumber}
                              </span>
                            )}
                            {reg.user.department && (
                              <span>• {reg.user.department}</span>
                            )}
                          </>
                        )}
                      </p>

                      {/* Event tag */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-800 bg-navy-50/90 border border-navy-200/70 px-2.5 py-0.5 rounded-lg">
                          <Calendar className="w-3 h-3 text-gold-600" />
                          <span>{reg.event.title}</span>
                        </span>
                        {reg.event.category && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700 bg-gold-100/80 px-2 py-0.5 rounded-md border border-gold-300">
                            {reg.event.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Badges: Status Pill + Attended Badge + Attempt Badge */}
                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0 self-start">
                    {/* Status Pill & Attended Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {!isTeam && reg.attendedAt && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Attended · {formatTime24(reg.attendedAt)}
                          </span>
                        </span>
                      )}
                      {isTeam && members.length > 0 && attendedMembersCount > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs",
                            attendedMembersCount === members.length
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-amber-50 text-amber-900 border-amber-300"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {attendedMembersCount}/{members.length} Attended
                          </span>
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusMeta.pillClass}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Attempt X of 2 Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-navy-800 bg-navy-100/70 px-2.5 py-0.5 rounded-full border border-navy-200/60">
                        Attempt {reg.attemptCount} of 2
                      </span>
                      {reg.withdrawCount > 0 && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {reg.withdrawCount} withdrawn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Section: Email & Phone with One-Click Copy */}
                <div className="p-3 rounded-2xl bg-navy-50/50 border border-navy-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Email with Copy */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-mist shrink-0" />
                      <span className="text-navy-900 font-medium break-all">
                        {reg.user.email}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            reg.user.email,
                            "Email",
                            `${reg.id}-email`
                          )
                        }
                        className="p-1 rounded-md text-mist hover:text-navy-950 hover:bg-navy-200/50 transition cursor-pointer"
                        title="Copy email address"
                        aria-label="Copy email address"
                      >
                        {copiedKey === `${reg.id}-email` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Phone with Copy */}
                    {reg.user.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-mist shrink-0" />
                        <span className="text-navy-900 font-mono">
                          {reg.user.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              reg.user.phone!,
                              "Phone number",
                              `${reg.id}-phone`
                            )
                          }
                          className="p-1 rounded-md text-mist hover:text-navy-950 hover:bg-navy-200/50 transition cursor-pointer"
                          title="Copy phone number"
                          aria-label="Copy phone number"
                        >
                          {copiedKey === `${reg.id}-phone` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submitted Date */}
                  <span className="text-[11px] text-mist shrink-0">
                    Submitted: {formattedDate}
                  </span>
                </div>

                {/* Team Roster as Chips with Roll Numbers (Collapsed if > 3) */}
                {isTeam && members.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                      Team Roster ({members.length} Participants):
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {visibleMembers.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border text-xs shadow-2xs",
                            m.attendedAt
                              ? "border-emerald-300 bg-emerald-50/60 text-emerald-950 font-semibold"
                              : "border-navy-200 text-navy-950"
                          )}
                        >
                          <span className="font-semibold">{m.fullName}</span>
                          <span className="font-mono text-[11px] font-bold text-mist">
                            [{m.rollNumber}]
                          </span>
                          {m.attendedAt && (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-md">
                              Attended
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Expand / Collapse Button if > 3 members */}
                      {hiddenMembersCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleRoster(reg.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-navy-900 bg-navy-100 hover:bg-navy-200 transition cursor-pointer"
                        >
                          {isRosterExpanded ? (
                            <>
                              <span>Show fewer</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>+{hiddenMembersCount} more</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Show Notes ONLY when Reject Reason exists! */}
                {showRejectNote && (
                  <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-950 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold uppercase text-[10px] tracking-wider text-rose-700 block">
                        Rejection Reason Recorded
                      </span>
                      <p className="leading-relaxed font-medium">{rejectNote}</p>
                    </div>
                  </div>
                )}

                {/* Card Actions Footer: Approve & Reject Buttons */}
                <div className="pt-2 border-t border-navy-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-mist">
                    Application ID:{" "}
                    <span className="font-mono text-navy-800">
                      {reg.id.slice(0, 10)}...
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                    {reg.status === "PENDING" ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                          type="button"
                          variant="gold"
                          size="sm"
                          disabled={isOperating}
                          onClick={() => handleApprove(reg.id)}
                          className="font-bold shadow-xs text-xs flex-1 sm:flex-none justify-center"
                        >
                          {isOperating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-900" />
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
                            setRejectReason(reg.rejectionReason || reg.notes || "");
                          }}
                          className="border-danger/40 text-danger hover:bg-danger-bg text-xs font-semibold flex-1 sm:flex-none justify-center"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    ) : reg.status === "APPROVED" ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Approved Application</span>
                        </span>
                        {reg.attendedAt && (
                          <button
                            type="button"
                            onClick={() => setUndoTarget(reg)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                            title="Undo check-in"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo Check-in</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingReg(reg);
                            setRejectReason("");
                          }}
                          className="text-xs font-semibold text-mist hover:text-danger underline transition cursor-pointer"
                        >
                          Revoke / Reject
                        </button>
                      </div>
                    ) : reg.status === "REJECTED" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-700">
                          Rejected
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isOperating}
                          onClick={() => handleApprove(reg.id)}
                          className="text-xs font-bold shadow-2xs"
                        >
                          {isOperating && (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          )}
                          <span>Re-approve</span>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-mist italic">
                        Withdrawn by applicant
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3. Reject Reason Modal */}
      {rejectingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-navy-100 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <h3 className="font-heading text-lg font-bold text-navy-950 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-danger" />
                <span>Reject Registration</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingReg(null)}
                className="p-1 rounded-xl text-mist hover:text-navy-950 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-mist leading-relaxed">
                Provide a clear reason for rejecting the registration of{" "}
                <strong className="text-navy-950">
                  {rejectingReg.team?.name || rejectingReg.user.name}
                </strong>
                . This explanation is stored and visible on the student&apos;s dashboard.
              </p>

              <div>
                <label
                  htmlFor="reject-reason"
                  className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1"
                >
                  Rejection Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Ineligible department roll number, duplicate roster entry, or missing prerequisites..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-danger/50 bg-white placeholder:text-mist/70"
                />
                <span className="text-[10px] text-mist block mt-1">
                  Minimum 3 characters required.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRejectingReg(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleRejectSubmit}
                disabled={isPending || rejectReason.trim().length < 3}
                className="font-bold shadow-xs"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                )}
                <span>Confirm Rejection</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Check-In Confirmation Modal */}
      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-navy-100 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <RotateCcw className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-950 font-heading">
                Undo Attendance Check-In?
              </h3>
              <p className="text-xs text-mist leading-relaxed">
                Are you sure you want to revert check-in for{" "}
                <strong className="text-navy-900">{undoTarget.user.name}</strong>?
                Their attendance record will be cleared.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUndoTarget(null)}
                disabled={isUndoing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUndoSubmit}
                disabled={isUndoing}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isUndoing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                Confirm Undo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
