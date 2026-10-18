"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { QrScanner } from "@/components/scanner/QrScanner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import {
  scanCheckInAction,
  manualCheckInAction,
  searchManualRegistrationsAction,
  undoCheckInAction,
  getEventAttendanceStatsAction,
} from "@/features/attendance/attendance.actions";
import { formatEventDate, formatTime24 } from "@/lib/dates";
import {
  CheckCircle2,
  XCircle,
  Users,
  Search,
  RotateCcw,
  Clock,
  QrCode,
  UserCheck,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";

export interface ScannableEventOption {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: Date | string;
  approvedCount: number;
}

interface ScanResultCardState {
  type: "success" | "already" | "error";
  title: string;
  message: string;
  studentName?: string;
  rollNumber?: string | null;
  teamName?: string | null;
  eventTitle?: string;
  attendedAt?: Date | string;
}

export interface AttendanceStatsState {
  totalApproved: number;
  totalAttended: number;
  recentCheckIns: Array<{
    id: string;
    attendedAt: Date | string | null;
    user: { name: string; rollNumber: string | null; department: string | null };
    team?: { name: string } | null;
    attendedBy?: { name: string } | null;
  }>;
}

export interface ManualSearchItem {
  id: string;
  status: string;
  attendedAt: Date | string | null;
  user: {
    id: string;
    name: string;
    rollNumber: string | null;
    email: string;
    department: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
}

export function ScanConsoleClient({
  events,
  initialEventId,
  initialStats,
}: {
  events: ScannableEventOption[];
  initialEventId?: string;
  initialStats: AttendanceStatsState;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || events[0]?.id || ""
  );

  const [isCooldown, setIsCooldown] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultCardState | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live stats & recent check-ins
  const [stats, setStats] = useState<AttendanceStatsState>(initialStats);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Manual fallback search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ManualSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingCheckIn, startCheckInTransition] = useTransition();

  // Undo check-in state
  const [undoTarget, setUndoTarget] = useState<{ id: string; name: string } | null>(null);
  const [isUndoing, startUndoTransition] = useTransition();

  // Selected event details
  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Fetch stats for selected event
  const refreshStats = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setIsLoadingStats(true);
    try {
      const res = await getEventAttendanceStatsAction(eventId);
      if (res.ok) {
        setStats({
          totalApproved: res.data.totalApproved,
          totalAttended: res.data.totalAttended,
          recentCheckIns: res.data.recentCheckIns,
        });
      }
    } catch {
      // silently handle stats refresh errors
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const handleEventChange = (newEventId: string) => {
    setSelectedEventId(newEventId);
    setScanResult(null);
    setSearchQuery("");
    setSearchResults([]);
    refreshStats(newEventId);
  };

  // Clean cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const triggerVibration = (type: "success" | "already" | "error") => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        if (type === "success") {
          navigator.vibrate?.([100, 50, 100]);
        } else if (type === "already") {
          navigator.vibrate?.(120);
        } else {
          navigator.vibrate?.([200, 100, 200]);
        }
      }
    } catch {
      // Vibration not permitted or supported
    }
  };

  // Main QR scan handler
  const handleScan = async (rawCode: string) => {
    if (isCooldown || !selectedEventId) return;

    // Enter 2-second cooldown to prevent double scans while code is still in camera view
    setIsCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setIsCooldown(false);
    }, 2000);

    try {
      const res = await scanCheckInAction({
        token: rawCode,
        eventId: selectedEventId,
      });

      if (!res.ok) {
        triggerVibration("error");
        setScanResult({
          type: "error",
          title: "Check-in Denied",
          message: res.error,
        });
        return;
      }

      const data = res.data;

      if (!data.success) {
        triggerVibration("error");
        setScanResult({
          type: "error",
          title: "Scan Rejected",
          message: data.message,
        });
      } else if (data.alreadyCheckedIn) {
        triggerVibration("already");
        setScanResult({
          type: "already",
          title: "Already Checked In",
          message: data.message,
          studentName: data.registration?.studentName,
          rollNumber: data.registration?.rollNumber,
          teamName: data.registration?.teamName,
          eventTitle: data.registration?.eventTitle,
          attendedAt: data.attendedAt,
        });
      } else {
        triggerVibration("success");
        setScanResult({
          type: "success",
          title: "Entry Verified",
          message: data.message,
          studentName: data.registration?.studentName,
          rollNumber: data.registration?.rollNumber,
          teamName: data.registration?.teamName,
          eventTitle: data.registration?.eventTitle,
          attendedAt: data.attendedAt,
        });
        // Update stats
        refreshStats(selectedEventId);
      }
    } catch {
      triggerVibration("error");
      setScanResult({
        type: "error",
        title: "Scan Error",
        message: "Failed to connect to server. Please try again.",
      });
    }
  };

  // Manual search trigger
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedEventId) return;

    setIsSearching(true);
    try {
      const res = await searchManualRegistrationsAction(
        selectedEventId,
        searchQuery.trim()
      );
      if (res.ok) {
        setSearchResults(res.data);
        if (res.data.length === 0) {
          toast.info("No approved registrations matched your query.");
        }
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to search registrations.");
    } finally {
      setIsSearching(false);
    }
  };

  // Manual Check-in action
  const handleManualCheckIn = (registrationId: string) => {
    if (!selectedEventId) return;

    startCheckInTransition(async () => {
      try {
        const res = await manualCheckInAction({
          registrationId,
          eventId: selectedEventId,
        });

        if (!res.ok) {
          triggerVibration("error");
          toast.error(res.error);
          return;
        }

        const data = res.data;
        if (!data.success) {
          triggerVibration("error");
          toast.error(data.message);
        } else if (data.alreadyCheckedIn) {
          triggerVibration("already");
          setScanResult({
            type: "already",
            title: "Already Checked In",
            message: data.message,
            studentName: data.registration?.studentName,
            rollNumber: data.registration?.rollNumber,
            teamName: data.registration?.teamName,
            eventTitle: data.registration?.eventTitle,
            attendedAt: data.attendedAt,
          });
          toast.warning(data.message);
        } else {
          triggerVibration("success");
          setScanResult({
            type: "success",
            title: "Entry Verified",
            message: data.message,
            studentName: data.registration?.studentName,
            rollNumber: data.registration?.rollNumber,
            teamName: data.registration?.teamName,
            eventTitle: data.registration?.eventTitle,
            attendedAt: data.attendedAt,
          });
          toast.success("Checked in successfully!");
          // Clear search results and refresh stats
          setSearchResults([]);
          setSearchQuery("");
          refreshStats(selectedEventId);
        }
      } catch {
        toast.error("Failed to process manual check-in.");
      }
    });
  };

  // Undo check-in action
  const handleConfirmUndo = () => {
    if (!undoTarget) return;

    startUndoTransition(async () => {
      try {
        const res = await undoCheckInAction({ registrationId: undoTarget.id });
        if (res.ok) {
          toast.success(`Check-in undone for ${undoTarget.name}`);
          setUndoTarget(null);
          refreshStats(selectedEventId);
          // If active result card was this user, clear it
          setScanResult(null);
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Failed to undo check-in.");
      }
    });
  };

  const percentage =
    stats.totalApproved > 0
      ? Math.round((stats.totalAttended / stats.totalApproved) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header and Event Selector */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-navy-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-700 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300">
                Gate Entry Control
              </span>
              <span className="text-xs text-mist font-semibold">
                Camera & QR Scanner
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
              Scan Entry Pass
            </h1>
          </div>

          {/* Event Picker */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-bold uppercase tracking-wider text-mist mb-1.5">
              Select Active Event
            </label>
            <Select
              value={selectedEventId}
              onChange={(val) => handleEventChange(val)}
              options={events.map((e) => ({
                value: e.id,
                label: `${e.title} (${e.approvedCount} approved)`,
              }))}
            />
          </div>
        </div>

        {/* Selected Event Context & Live Attendance Counter */}
        {currentEvent && (
          <div className="pt-4 border-t border-navy-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
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

            {/* Live Counter Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                  Attendance Progress
                </p>
                <p className="text-sm font-extrabold text-navy-950">
                  <span className="text-emerald-600">{stats.totalAttended}</span>
                  <span className="text-mist font-normal"> / </span>
                  <span>{stats.totalApproved}</span>{" "}
                  <span className="text-xs text-mist font-medium">approved</span>
                </p>
              </div>

              {/* Circular / Segmented Progress Pill */}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-heading font-black text-xs shrink-0">
                {percentage}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Scanner & Result Card, Right Live Feed & Manual Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Scanner & Big Result Card) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Camera Scanner Component */}
          <Card className="p-4 sm:p-5 bg-white border border-navy-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-gold-600" />
                <h2 className="font-bold text-navy-950 text-sm sm:text-base">
                  Live Viewfinder
                </h2>
              </div>

              {isCooldown && (
                <span className="text-xs font-semibold text-gold-700 bg-gold-100 px-2.5 py-0.5 rounded-full animate-pulse">
                  Scan received · Paused 2s
                </span>
              )}
            </div>

            <QrScanner onScan={handleScan} isPaused={isCooldown} />

            <p className="text-[11px] text-mist text-center">
              Position the participant&apos;s QR pass clearly inside the frame.
              The phone vibrates on scan where supported.
            </p>
          </Card>

          {/* Big Clear Result Card */}
          {scanResult && (
            <div
              className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
                scanResult.type === "success"
                  ? "bg-emerald-500/10 border-emerald-400 text-emerald-950"
                  : scanResult.type === "already"
                  ? "bg-amber-500/10 border-amber-400 text-amber-950"
                  : "bg-rose-500/10 border-rose-400 text-rose-950"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    scanResult.type === "success"
                      ? "bg-emerald-600 text-white"
                      : scanResult.type === "already"
                      ? "bg-amber-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {scanResult.type === "success" && (
                    <CheckCircle2 className="w-7 h-7" />
                  )}
                  {scanResult.type === "already" && (
                    <Clock className="w-7 h-7" />
                  )}
                  {scanResult.type === "error" && (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        scanResult.type === "success"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : scanResult.type === "already"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-rose-100 text-rose-900 border-rose-300"
                      }`}
                    >
                      {scanResult.title}
                    </span>

                    {scanResult.attendedAt && (
                      <span className="text-xs font-mono font-semibold">
                        {formatTime24(scanResult.attendedAt)}
                      </span>
                    )}
                  </div>

                  {scanResult.studentName ? (
                    <div>
                      <h3 className="text-lg sm:text-xl font-black font-heading tracking-tight text-navy-950">
                        {scanResult.studentName}
                      </h3>
                      <p className="text-xs font-semibold text-mist">
                        {scanResult.rollNumber && (
                          <span className="font-mono text-navy-900 font-bold mr-2">
                            [{scanResult.rollNumber}]
                          </span>
                        )}
                        {scanResult.teamName && (
                          <span>Team: {scanResult.teamName}</span>
                        )}
                      </p>
                      {scanResult.eventTitle && (
                        <p className="text-[11px] text-mist/90 mt-0.5">
                          Event: {scanResult.eventTitle}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-bold pt-1">{scanResult.message}</p>
                  )}

                  {scanResult.studentName && (
                    <p className="text-xs font-semibold pt-1">
                      {scanResult.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Fallback Box */}
          <Card className="p-5 bg-white border border-navy-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-navy-950 font-bold text-sm">
                <Search className="w-4 h-4 text-gold-600" />
                <span>Manual Entry Fallback</span>
              </div>
              <span className="text-[10px] text-mist">
                If camera cannot scan
              </span>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student name, roll number, or paste token..."
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white placeholder:text-mist/70"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSearching || !searchQuery.trim()}
                className="shrink-0 bg-navy-950 text-ivory hover:bg-navy-900"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Search</span>
                )}
              </Button>
            </form>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 pt-2 border-t border-navy-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                  Matching Registrations ({searchResults.length})
                </p>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {searchResults.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-3 rounded-xl bg-navy-50/70 border border-navy-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-navy-950 truncate">
                          {reg.user.name}
                        </p>
                        <p className="text-[11px] text-mist">
                          {reg.user.rollNumber && (
                            <span className="font-mono mr-1.5 font-semibold text-navy-800">
                              {reg.user.rollNumber}
                            </span>
                          )}
                          {reg.team && (
                            <span className="text-gold-700 font-medium">
                              Team: {reg.team.name}
                            </span>
                          )}
                        </p>
                      </div>

                      {reg.attendedAt ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          Attended · {formatTime24(reg.attendedAt)}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isProcessingCheckIn}
                          onClick={() => handleManualCheckIn(reg.id)}
                          className="shrink-0 text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Check In
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Attendance Feed */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 bg-white border border-navy-100 shadow-sm flex flex-col h-full min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-600" />
                <h2 className="font-bold text-navy-950 text-sm sm:text-base">
                  Recent Check-Ins
                </h2>
              </div>
              <span className="text-xs text-mist font-semibold">
                {stats.totalAttended} total
              </span>
            </div>

            {/* Feed List */}
            <div className="flex-1 mt-3 overflow-y-auto max-h-[560px] space-y-2.5 pr-1 no-scrollbar">
              {isLoadingStats && stats.recentCheckIns.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-mist gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
                  <p className="text-xs">Loading check-ins...</p>
                </div>
              ) : stats.recentCheckIns.length === 0 ? (
                <div className="py-16 text-center text-mist space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-navy-200" />
                  <p className="text-sm font-semibold text-navy-900">
                    No Check-Ins Yet
                  </p>
                  <p className="text-xs max-w-xs mx-auto">
                    Scanned attendees will appear live in this list as they pass
                    through the entrance.
                  </p>
                </div>
              ) : (
                stats.recentCheckIns.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-navy-100 hover:border-navy-200 transition-colors shadow-2xs flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-navy-950 truncate text-sm">
                          {item.user.name}
                        </p>
                        {item.team && (
                          <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-200">
                            {item.team.name}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-mist flex items-center gap-1.5 mt-0.5">
                        {item.user.rollNumber && (
                          <span className="font-mono text-navy-800 font-semibold">
                            {item.user.rollNumber}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {item.attendedAt ? formatTime24(item.attendedAt) : "—"}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setUndoTarget({ id: item.id, name: item.user.name })
                      }
                      className="shrink-0 text-[11px] font-semibold text-mist hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Undo check-in"
                    >
                      Undo
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Undo Confirmation Modal */}
      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-navy-100 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <RotateCcw className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-950 font-heading">
                Undo Check-In?
              </h3>
              <p className="text-xs text-mist leading-relaxed">
                Are you sure you want to revert check-in for{" "}
                <strong className="text-navy-900">{undoTarget.name}</strong>?
                Their status will return to Approved (not attended).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
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
