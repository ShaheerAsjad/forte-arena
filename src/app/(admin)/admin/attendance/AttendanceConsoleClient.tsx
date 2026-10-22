"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import {
  manualCheckInAction,
  undoCheckInAction,
  getEventDetailedStatsAction,
  getEventAttendanceParticipantsAction,
} from "@/features/attendance/attendance.actions";
import { isEventAttendanceAllowed } from "@/features/attendance/attendance.config";
import { formatEventDate, formatTime24 } from "@/lib/dates";
import {
  useSelectedEventId,
  setStoredSelectedEventId,
  resolveSelectedEventId,
} from "@/features/attendance/attendance.selection";
import type {
  EventDetailedStats,
  AttendanceParticipantItem,
} from "@/features/attendance/repositories/attendance.repository";
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Download,
  Calendar,
  MapPin,
  QrCode,
  Info,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { getDepartmentLabel } from "@/features/profile/academic.config";

interface EventOption {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: Date | string;
  status: string;
}

export function AttendanceConsoleClient({
  events,
  initialEventId,
  initialStats,
  initialParticipants,
}: {
  events: EventOption[];
  initialEventId?: string;
  initialStats: EventDetailedStats;
  initialParticipants: AttendanceParticipantItem[];
}) {
  const storedEventId = useSelectedEventId();
  const [localEventId, setLocalEventId] = useState<string | null>(null);

  const urlEventId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("eventId")
      : null;

  const validIds = events.map((e) => e.id);
  const selectedEventId = resolveSelectedEventId({
    urlEventId,
    storedEventId: localEventId || storedEventId,
    validEventIds: validIds,
    defaultEventId: initialEventId || events[0]?.id,
  });

  const [stats, setStats] = useState<EventDetailedStats>(initialStats);
  const [participants, setParticipants] =
    useState<AttendanceParticipantItem[]>(initialParticipants);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "NOT_YET">("ALL");

  // Action transitions
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Undo Confirmation State
  const [undoTarget, setUndoTarget] = useState<{
    id: string;
    participantType: "SOLO" | "TEAM_MEMBER";
    name: string;
  } | null>(null);
  const [isUndoing, startUndoTransition] = useTransition();

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const isReadOnly = !isEventAttendanceAllowed(currentEvent?.status || "");

  // Refresh stats & participants on event change
  const refreshEventData = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setIsLoading(true);
    setLoadError(null);
    setParticipants([]);
    try {
      const [statsRes, partsRes] = await Promise.all([
        getEventDetailedStatsAction(eventId),
        getEventAttendanceParticipantsAction(eventId),
      ]);

      if (!statsRes.ok || !partsRes.ok) {
        const errorMsg =
          (!statsRes.ok ? statsRes.error : "") ||
          (!partsRes.ok ? partsRes.error : "") ||
          "Failed to load attendance records.";
        setLoadError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setStats(statsRes.data);
      setParticipants(partsRes.data);
    } catch {
      const errorMsg = "Failed to load attendance records.";
      setLoadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lastFetchedEventIdRef = useRef<string>(initialEventId);

  // Fetch event data when selectedEventId changes (single fetch path on event switch)
  useEffect(() => {
    if (!selectedEventId) return;
    setStoredSelectedEventId(selectedEventId);

    if (selectedEventId !== lastFetchedEventIdRef.current) {
      lastFetchedEventIdRef.current = selectedEventId;
      refreshEventData(selectedEventId);
    }
  }, [selectedEventId, refreshEventData]);

  const handleEventChange = (newEventId: string) => {
    if (!newEventId || newEventId === selectedEventId) return;

    setLocalEventId(newEventId);
    setStoredSelectedEventId(newEventId);
    setSearchQuery("");
    setStatusFilter("ALL");
    setLoadError(null);
    // Show loading spinner immediately and clear previous event's list so it does not linger under new title
    setIsLoading(true);
    setParticipants([]);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("eventId", newEventId);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Manual Check-In
  const handleMarkPresent = (participant: AttendanceParticipantItem) => {
    if (isReadOnly || !selectedEventId) return;

    setProcessingId(participant.id);
    startTransition(async () => {
      try {
        const res = await manualCheckInAction({
          participantId: participant.id,
          participantType: participant.participantType,
          eventId: selectedEventId,
        });

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        const data = res.data;
        if (!data.success) {
          toast.error(data.message);
        } else if (data.alreadyCheckedIn) {
          toast.info(data.message);
        } else {
          toast.success(`Marked present: ${participant.name}`);
          // Update local state optimistically
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participant.id
                ? {
                    ...p,
                    attendedAt: data.attendedAt || new Date(),
                    attendanceMethod: "MANUAL",
                  }
                : p
            )
          );
          // Refetch stats in background
          const statsRes = await getEventDetailedStatsAction(selectedEventId);
          if (statsRes.ok) setStats(statsRes.data);
        }
      } catch {
        toast.error("Failed to mark participant present.");
      } finally {
        setProcessingId(null);
      }
    });
  };

  // Undo Check-In
  const handleConfirmUndo = () => {
    if (!undoTarget || !selectedEventId) return;

    startUndoTransition(async () => {
      try {
        const res = await undoCheckInAction({
          participantId: undoTarget.id,
          participantType: undoTarget.participantType,
        });

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        toast.success(`Check-in reversed for ${undoTarget.name}`);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === undoTarget.id
              ? {
                  ...p,
                  attendedAt: null,
                  attendanceMethod: null,
                }
              : p
          )
        );
        setUndoTarget(null);

        // Refetch stats in background
        const statsRes = await getEventDetailedStatsAction(selectedEventId);
        if (statsRes.ok) setStats(statsRes.data);
      } catch {
        toast.error("Failed to reverse check-in.");
      }
    });
  };

  // Filtered and sorted participants
  const filteredParticipants = participants.filter((p) => {
    if (statusFilter === "PRESENT" && !p.attendedAt) return false;
    if (statusFilter === "NOT_YET" && p.attendedAt) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchRoll = p.rollNumber?.toLowerCase().includes(q);
      const matchTeam = p.teamName?.toLowerCase().includes(q);
      return matchName || matchRoll || matchTeam;
    }
    return true;
  });

  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    if (statusFilter === "PRESENT") {
      const aTime = a.attendedAt ? new Date(a.attendedAt).getTime() : 0;
      const bTime = b.attendedAt ? new Date(b.attendedAt).getTime() : 0;
      return bTime - aTime;
    }
    return a.name.localeCompare(b.name);
  });

  const totalPresentCount = participants.filter((p) => p.attendedAt !== null).length;
  const totalNotYetCount = participants.filter((p) => p.attendedAt === null).length;

  if (events.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-800 flex items-center justify-center mx-auto border border-navy-200">
          <AlertCircle className="w-6 h-6 text-navy-600" />
        </div>
        <h2 className="text-xl font-bold font-heading text-navy-950">
          No Registered Events Found
        </h2>
        <p className="text-sm text-mist max-w-md mx-auto">
          Attendance records appear once participants have registered for events.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Event Selector Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-navy-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-700">
                Attendance Console
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black font-heading text-navy-950 tracking-tight mt-1 sm:mt-1.5">
              Event Attendance
            </h1>
            <p className="text-xs sm:text-sm text-mist">
              Review real-time attendance stats, manage check-in lists, and export records.
            </p>
          </div>

          {/* Event Picker Dropdown & Quick Scan Shortcut */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-80">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-mist">
                  Select Event
                </label>
                {currentEvent && (
                  <span className="text-[10px] font-semibold text-navy-700 bg-navy-100/90 px-2 py-0.5 rounded-full border border-navy-200 shrink-0">
                    {currentEvent.status === "PUBLISHED"
                      ? "Published"
                      : currentEvent.status === "CLOSED"
                      ? "Closed"
                      : currentEvent.status === "COMPLETED"
                      ? "Completed"
                      : currentEvent.status === "CANCELLED"
                      ? "Cancelled"
                      : "Draft"}
                  </span>
                )}
              </div>
              <Select
                value={selectedEventId}
                onChange={(val) => handleEventChange(val)}
                options={events.map((e) => {
                  const statusName =
                    e.status === "PUBLISHED"
                      ? "Published"
                      : e.status === "CLOSED"
                      ? "Closed"
                      : e.status === "COMPLETED"
                      ? "Completed"
                      : e.status === "CANCELLED"
                      ? "Cancelled"
                      : "Draft";

                  return {
                    value: e.id,
                    label: e.title,
                    description: `${statusName} · ${formatEventDate(e.startsAt)}`,
                  };
                })}
              />
            </div>

            <Link
              href={`/admin/scan${selectedEventId ? `?eventId=${selectedEventId}` : ""}`}
              className="mt-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-navy-950 text-ivory hover:bg-navy-900 transition-colors shadow-2xs shrink-0"
              title="Open Camera QR Scanner"
            >
              <QrCode className="w-4 h-4 text-gold-400" />
              <span>Scan QR</span>
            </Link>
          </div>
        </div>

        {/* Live Info Bar & Event Metadata */}
        {currentEvent && (
          <div className="pt-3 border-t border-navy-50 flex flex-wrap items-center justify-between gap-3 text-xs text-mist">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1 font-medium text-navy-900">
                <Calendar className="w-3.5 h-3.5 text-gold-600" />
                {formatEventDate(currentEvent.startsAt)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold-600" />
                {currentEvent.venue}
              </span>
            </div>

            {/* CSV Export Button */}
            <a
              href={`/api/admin/events/${selectedEventId}/export-attendance`}
              download
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-navy-900 bg-navy-50 hover:bg-navy-100 border border-navy-200 transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gold-600" />
              <span>Download attendance (CSV)</span>
            </a>
          </div>
        )}
      </div>

      {/* Read-Only Calm Banner */}
      {isReadOnly && currentEvent && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-navy-50/90 border border-navy-200 text-navy-900 flex items-center gap-3 text-xs sm:text-sm shadow-2xs animate-in fade-in">
          <Info className="w-4 h-4 text-navy-600 shrink-0" />
          <p className="font-medium">
            This event has ended — attendance is read-only.
          </p>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Applications */}
        <Card className="p-3.5 sm:p-5 bg-white border border-navy-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-mist">
              Applications
            </span>
            <FileText className="w-4 h-4 text-navy-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-heading text-navy-950">
            {stats.applications.total}
          </p>
          <p className="text-[10px] sm:text-[11px] text-mist leading-tight pt-0.5">
            <span className="text-emerald-700 font-semibold">{stats.applications.approved} app</span> ·{" "}
            <span>{stats.applications.pending} pend</span> ·{" "}
            <span>{stats.applications.rejected} rej</span>
          </p>
        </Card>

        {/* Card 2: Approved People */}
        <Card className="p-3.5 sm:p-5 bg-white border border-navy-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-mist">
              Approved People
            </span>
            <Users className="w-4 h-4 text-gold-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-heading text-navy-950">
            {stats.approvedPeople}
          </p>
          <p className="text-[10px] sm:text-[11px] text-mist leading-tight pt-0.5">
            Eligible attendees (solo + team members)
          </p>
        </Card>

        {/* Card 3: Present */}
        <Card className="p-3.5 sm:p-5 bg-white border border-navy-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-mist">
              Present
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-heading text-emerald-700">
            {stats.presentPeople}
          </p>
          <p className="text-[10px] sm:text-[11px] text-mist leading-tight pt-0.5 flex flex-wrap gap-1">
            <span className="font-medium text-emerald-800">QR {stats.presentSplit.qr}</span>
            <span>·</span>
            <span className="font-medium text-amber-800">Manual {stats.presentSplit.manual}</span>
            {stats.presentSplit.earlier > 0 && (
              <>
                <span>·</span>
                <span>Earlier {stats.presentSplit.earlier}</span>
              </>
            )}
          </p>
        </Card>

        {/* Card 4: Not Yet Present */}
        <Card className="p-3.5 sm:p-5 bg-white border border-navy-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-mist">
              Not Yet Present
            </span>
            <Clock className="w-4 h-4 text-navy-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-heading text-navy-950">
            {stats.notYetPresent}
          </p>
          <p className="text-[10px] sm:text-[11px] text-mist leading-tight pt-0.5 font-medium">
            <span className="text-emerald-700 font-bold">{stats.percentage}%</span> attendance rate
          </p>
        </Card>
      </div>

      {/* People List Section */}
      <Card className="p-4 sm:p-6 bg-white border border-navy-100 shadow-sm space-y-4">
        {/* Section Header with Search and Filter Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-navy-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-navy-950">
              Approved Participant Directory
            </h2>
            <p className="text-xs text-mist">
              Showing approved individual participants and team members for this event.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll no, team..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white placeholder:text-mist/70"
            />
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-navy-950 text-ivory"
                : "bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-200"
            }`}
          >
            All ({participants.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PRESENT")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "PRESENT"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            Present ({totalPresentCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("NOT_YET")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "NOT_YET"
                ? "bg-navy-900 text-ivory"
                : "bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-200"
            }`}
          >
            Not yet present ({totalNotYetCount})
          </button>

          {statusFilter === "PRESENT" && (
            <span className="text-[11px] text-mist ml-auto hidden sm:inline-block">
              Sorted by newest check-in first
            </span>
          )}
        </div>

        {/* Loading / Error / Empty States */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-mist gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
            <p className="text-xs">Loading participants...</p>
          </div>
        ) : loadError ? (
          <div className="py-12 text-center text-mist space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                Failed to load participants
              </p>
              <p className="text-xs text-mist max-w-sm mx-auto mt-0.5">
                {loadError}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshEventData(selectedEventId)}
              className="text-xs font-semibold cursor-pointer"
            >
              Retry
            </Button>
          </div>
        ) : sortedParticipants.length === 0 ? (
          <div className="py-12 text-center text-mist space-y-2">
            <Users className="w-8 h-8 mx-auto text-navy-200" />
            <p className="text-sm font-semibold text-navy-900">
              No participants match your query
            </p>
            <p className="text-xs max-w-xs mx-auto">
              Try adjusting your search query or filter chips above.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-mist uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">Affiliation / Team</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {sortedParticipants.map((p) => {
                    const isPresent = p.attendedAt !== null;
                    return (
                      <tr
                        key={`${p.participantType}-${p.id}`}
                        className="hover:bg-navy-50/50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <p className="font-extrabold text-navy-950 text-xs sm:text-sm">
                            {p.name}
                          </p>
                          {p.rollNumber && (
                            <p className="font-mono text-[11px] text-navy-800 font-semibold mt-0.5">
                              {p.rollNumber}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {p.teamName ? (
                            <span className="inline-block text-[10px] font-bold text-gold-800 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                              Team: {p.teamName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-navy-700">
                              {getDepartmentLabel(p.department) ?? p.department ?? "Individual"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Present · {formatTime24(p.attendedAt!)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-navy-100 text-navy-600 border border-navy-200">
                              <span>Not yet present</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isPresent && (
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                p.attendanceMethod === "QR"
                                  ? "bg-cyan-50 text-cyan-900 border-cyan-200"
                                  : p.attendanceMethod === "MANUAL"
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-navy-50 text-navy-700 border-navy-200"
                              }`}
                            >
                              {p.attendanceMethod === "QR"
                                ? "QR"
                                : p.attendanceMethod === "MANUAL"
                                ? "Manual"
                                : "Earlier"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isPresent ? (
                            <button
                              type="button"
                              onClick={() =>
                                setUndoTarget({
                                  id: p.id,
                                  participantType: p.participantType,
                                  name: p.name,
                                })
                              }
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Undo
                            </button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isReadOnly || processingId === p.id}
                              onClick={() => handleMarkPresent(p)}
                              title={
                                isReadOnly
                                  ? "Attendance is closed for this event"
                                  : "Mark participant present"
                              }
                              className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              {processingId === p.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                              )}
                              Mark present
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (sm:hidden) */}
            <div className="sm:hidden space-y-2.5">
              {sortedParticipants.map((p) => {
                const isPresent = p.attendedAt !== null;
                return (
                  <div
                    key={`mobile-${p.participantType}-${p.id}`}
                    className="p-3 rounded-2xl bg-white border border-navy-100 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-navy-950 text-xs truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-mist flex flex-wrap items-center gap-1 mt-0.5">
                          {p.rollNumber && (
                            <span className="font-mono text-navy-800 font-semibold">
                              [{p.rollNumber}]
                            </span>
                          )}
                          {p.department && (
                            <span>{getDepartmentLabel(p.department) ?? p.department}</span>
                          )}
                        </p>
                      </div>

                      {p.teamName ? (
                        <span className="inline-block text-[10px] font-bold text-gold-800 bg-gold-50 px-2 py-0.5 rounded border border-gold-200 shrink-0">
                          {p.teamName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-mist font-medium">Solo</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-navy-50">
                      <div>
                        {isPresent ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{formatTime24(p.attendedAt!)}</span>
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                p.attendanceMethod === "QR"
                                  ? "bg-cyan-50 text-cyan-900 border-cyan-200"
                                  : p.attendanceMethod === "MANUAL"
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-navy-50 text-navy-700 border-navy-200"
                              }`}
                            >
                              {p.attendanceMethod === "QR"
                                ? "QR"
                                : p.attendanceMethod === "MANUAL"
                                ? "Manual"
                                : "Earlier"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-mist font-medium">
                            Not yet present
                          </span>
                        )}
                      </div>

                      <div>
                        {isPresent ? (
                          <button
                            type="button"
                            onClick={() =>
                              setUndoTarget({
                                id: p.id,
                                participantType: p.participantType,
                                name: p.name,
                              })
                            }
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded cursor-pointer"
                          >
                            Undo
                          </button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isReadOnly || processingId === p.id}
                            onClick={() => handleMarkPresent(p)}
                            className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            {processingId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                            )}
                            Mark present
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Undo Confirmation Modal */}
      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-navy-100 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <RotateCcw className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-950 font-heading">
                Undo Attendance Record?
              </h3>
              <p className="text-xs text-mist leading-relaxed">
                Are you sure you want to revert check-in for{" "}
                <strong className="text-navy-900">{undoTarget.name}</strong>?
                Their attendance record and check-in time will be cleared.
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
                onClick={handleConfirmUndo}
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
