"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { QrScanner } from "@/components/scanner/QrScanner";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  scanCheckInAction,
  getEventAttendanceStatsAction,
} from "@/features/attendance/attendance.actions";
import { formatEventDate, formatTime24 } from "@/lib/dates";
import { getEventNotOpenCardTitle } from "@/features/attendance/attendance.config";
import {
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  UserCheck,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";

export interface ScannableEventOption {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: Date | string;
  status: string;
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
  teamProgress?: string;
  scannedLength?: number;
}

export interface AttendanceStatsState {
  totalApproved: number;
  totalAttended: number;
  recentCheckIns: Array<{
    id: string;
    participantType: "SOLO" | "TEAM_MEMBER";
    name: string;
    rollNumber: string | null;
    department?: string | null;
    teamName: string | null;
    attendedAt: Date | string | null;
    attendedBy?: { name: string } | null;
  }>;
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

  const [stats, setStats] = useState<AttendanceStatsState>(initialStats);

  // Scan cooldown and state
  const [isCooldown, setIsCooldown] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Big scan result card
  const [scanResult, setScanResult] = useState<ScanResultCardState | null>(null);

  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Refresh attendance stats for currently active event
  const refreshStats = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await getEventAttendanceStatsAction(eventId);
      if (res.ok) {
        setStats(res.data);
      }
    } catch {
      // Background fetch failure ignored
    }
  }, []);

  const handleEventChange = (newEventId: string) => {
    setSelectedEventId(newEventId);
    setScanResult(null);
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
          title:
            data.code === "INVALID_FORMAT"
              ? "Invalid Pass Format"
              : data.code === "EVENT_NOT_OPEN"
              ? getEventNotOpenCardTitle(currentEvent?.status)
              : "Scan Rejected",
          message: data.message,
          scannedLength: data.scannedLength,
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
          teamProgress: data.registration?.teamProgress,
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
          teamProgress: data.registration?.teamProgress,
          attendedAt: data.attendedAt,
        });
        // Auto refresh stats
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

  const percentage =
    stats.totalApproved > 0
      ? Math.round((stats.totalAttended / stats.totalApproved) * 100)
      : 0;

  if (events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-800 flex items-center justify-center mx-auto border border-navy-200">
          <AlertCircle className="w-6 h-6 text-navy-600" />
        </div>
        <h2 className="text-xl font-bold font-heading text-navy-950">
          No Registered Events Found
        </h2>
        <p className="text-sm text-mist max-w-md mx-auto">
          Pass scanning activates once students have registered for an event. Check back after registrations are submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Event Selector Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-navy-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Gate Scanner Console
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black font-heading text-navy-950 tracking-tight mt-1 sm:mt-1.5">
              Event Pass Scanner
            </h1>
            <p className="text-xs sm:text-sm text-mist">
              Scan participant QR tickets at venue entry gates for instant verification.
            </p>
          </div>

          {/* Event Picker Dropdown */}
          <div className="w-full md:w-80">
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
                  description: `${statusName} · ${formatEventDate(e.startsAt)} · ${e.approvedCount} approved`,
                };
              })}
            />
          </div>
        </div>

        {/* Live Info Bar & Compact Live Counter */}
        {currentEvent && (
          <div className="pt-3 sm:pt-4 border-t border-navy-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-mist">
              <span className="text-[10px] font-semibold text-navy-700 bg-navy-100/80 px-2 py-0.5 rounded-full border border-navy-200">
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
              <span>•</span>
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

            {/* Compact Live Counter */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                  Attendance Progress
                </p>
                <p className="text-sm font-extrabold text-navy-950">
                  <span className="text-emerald-600">{stats.totalAttended}</span>
                  <span className="text-mist font-normal"> of </span>
                  <span>{stats.totalApproved}</span>{" "}
                  <span className="text-xs text-mist font-medium">people present</span>
                </p>
              </div>

              {/* Progress percentage pill */}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-heading font-black text-xs shrink-0">
                {percentage}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Focused Scanner Section */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Camera Scanner Card */}
        <Card className="p-3 sm:p-5 bg-white border border-navy-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-gold-600" />
              <h2 className="font-bold text-navy-950 text-sm sm:text-base">
                Live Viewfinder
              </h2>
            </div>

            {isCooldown && (
              <span className="text-[11px] font-semibold text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full animate-pulse">
                Scan received · Paused 2s
              </span>
            )}
          </div>

          <QrScanner onScan={handleScan} isPaused={isCooldown} />

          {/* Under Camera Link to Manual Attendance */}
          <div className="pt-2 flex flex-col items-center gap-2">
            <Link
              href={`/admin/attendance${selectedEventId ? `?eventId=${selectedEventId}` : ""}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 hover:text-navy-950 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-4 py-2.5 rounded-xl transition-colors shadow-2xs"
            >
              <UserCheck className="w-4 h-4 text-gold-600" />
              <span>Camera not working? Mark attendance manually</span>
            </Link>
            <p className="text-[11px] text-mist text-center">
              Position the participant&apos;s QR pass clearly inside the frame. The phone vibrates on scan where supported.
            </p>
          </div>
        </Card>

        {/* Big Clear Result Card */}
        {scanResult && (
          <div
            className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              scanResult.type === "success"
                ? "bg-emerald-500/10 border-emerald-400 text-emerald-950"
                : scanResult.type === "already"
                ? "bg-amber-500/10 border-amber-400 text-amber-950"
                : "bg-rose-500/10 border-rose-400 text-rose-950"
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  scanResult.type === "success"
                    ? "bg-emerald-600 text-white"
                    : scanResult.type === "already"
                    ? "bg-amber-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {scanResult.type === "success" && (
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
                {scanResult.type === "already" && (
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
                {scanResult.type === "error" && (
                  <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
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
                    <h3 className="text-base sm:text-xl font-black font-heading tracking-tight text-navy-950">
                      {scanResult.studentName}
                    </h3>
                    <div className="text-xs font-semibold text-mist flex flex-wrap items-center gap-1.5 mt-0.5">
                      {scanResult.rollNumber && (
                        <span className="font-mono text-navy-900 font-bold">
                          [{scanResult.rollNumber}]
                        </span>
                      )}
                      {scanResult.teamName && (
                        <span>Team: {scanResult.teamName}</span>
                      )}
                      {scanResult.teamProgress && (
                        <span className="text-[10px] font-bold text-navy-900 bg-gold-100/90 border border-gold-300 px-2 py-0.5 rounded-full">
                          {scanResult.teamProgress}
                        </span>
                      )}
                    </div>
                    {scanResult.eventTitle && (
                      <p className="text-xs text-mist font-medium mt-1">
                        Event: {scanResult.eventTitle}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-navy-950">
                      {scanResult.title}
                    </h3>
                    <p className="text-xs text-navy-800 leading-relaxed mt-0.5">
                      {scanResult.message}
                    </p>
                  </div>
                )}

                {scanResult.studentName && scanResult.message && (
                  <p className="text-xs text-navy-800/90 font-medium pt-1">
                    {scanResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
