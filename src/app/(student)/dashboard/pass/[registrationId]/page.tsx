import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { AttendanceService } from "@/features/attendance/services/attendance.service";
import { AppError } from "@/lib/errors";
import { formatEventFullDate, formatEventTime, formatTime24 } from "@/lib/dates";
import { getAttendanceClosedNoticeText } from "@/features/attendance/attendance.config";
import { TeamPassClient } from "./TeamPassClient";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: Promise<{ registrationId: string }>;
}

export const metadata = {
  title: "Entry Pass | Forte Arena",
  description: "Official event entry pass and QR code for event check-in.",
};

export default async function StudentPassPage({ params }: PageProps) {
  const user = await requireUser("/login?next=/dashboard");
  const { registrationId } = await params;

  let passData;
  try {
    passData = await AttendanceService.getOrCreateStudentPass(
      registrationId,
      user.id
    );
  } catch (err: unknown) {
    if (err instanceof AppError && err.code === "NOT_FOUND") {
      notFound();
    }
    // If forbidden (not owner or not approved), redirect back to dashboard
    redirect("/dashboard");
  }

  const { event, student, isEventAttendanceOpen } = passData;

  const eventDateStr = formatEventFullDate(event.startsAt);
  const eventTimeStr = formatEventTime(event.startsAt);

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10 bg-navy-50/50 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-4">
        {/* Navigation back */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-mist hover:text-navy-950 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-700 bg-gold-100/90 border border-gold-300/80 px-2.5 py-0.5 rounded-full">
            Official Pass
          </span>
        </div>

        {/* Closed warning banner if event is not live */}
        {!isEventAttendanceOpen && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{getAttendanceClosedNoticeText(event.status)}</span>
          </div>
        )}

        {/* Team Registration: Renders member tabs + individual passes */}
        {passData.isTeam && passData.team ? (
          <TeamPassClient
            registrationId={registrationId}
            event={event}
            eventDateStr={eventDateStr}
            eventTimeStr={eventTimeStr}
            team={passData.team}
            isEventAttendanceOpen={isEventAttendanceOpen}
          />
        ) : (
          /* Solo Registration Ticket */
          <div className="relative bg-white rounded-3xl shadow-xl border border-navy-100 overflow-hidden">
            {/* Top Ticket Header */}
            <div className="bg-navy-950 text-ivory p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-gold-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-gold-400/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-gold-400 text-xs font-extrabold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                    <span>Forte Arena Entry Pass</span>
                  </div>

                  {passData.attendedAt ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attended</span>
                    </span>
                  ) : isEventAttendanceOpen ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-400/20 text-gold-300 border border-gold-400/30">
                      Valid Pass
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-500/20 text-zinc-300 border border-zinc-400/30">
                      Closed
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight leading-tight">
                  {event.title}
                </h1>

                <div className="pt-2 border-t border-navy-800/80 flex flex-col gap-1.5 text-xs text-navy-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    <span>
                      {eventDateStr} • {eventTimeStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Perforation & Notches */}
            <div className="relative bg-white py-1 flex items-center justify-between">
              <div className="w-5 h-8 bg-navy-50/50 rounded-r-full -ml-1 border-r border-y border-navy-100 shadow-inner" />
              <div className="flex-1 border-b-2 border-dashed border-navy-200/80 mx-2" />
              <div className="w-5 h-8 bg-navy-50/50 rounded-l-full -mr-1 border-l border-y border-navy-100 shadow-inner" />
            </div>

            {/* Ticket Middle: QR Code */}
            <div className="px-6 py-6 sm:p-7 flex flex-col items-center justify-center text-center space-y-4 bg-white">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={passData.qrDataUrl!}
                  alt="Entry QR Code"
                  width={260}
                  height={260}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-navy-950">
                  Show this at the entry
                </p>
                <p className="text-[11px] text-mist max-w-xs">
                  Present this screen to the event coordinator at the registration
                  desk for verification and check-in.
                </p>
              </div>

              {passData.attendedAt && (
                <div className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    Checked in at {formatTime24(passData.attendedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Ticket Lower Section: Student Details */}
            <div className="bg-navy-50/60 p-6 sm:p-7 border-t border-navy-100 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                    Student Name
                  </p>
                  <p className="text-xs sm:text-sm font-extrabold text-navy-950 truncate">
                    {student.name}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                    Roll Number
                  </p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-navy-950">
                    {student.rollNumber || "N/A"}
                  </p>
                </div>

                {student.department && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                      Department
                    </p>
                    <p className="text-xs font-semibold text-navy-900">
                      {student.department}
                    </p>
                  </div>
                )}
              </div>

              {/* Security Footer */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-mist border-t border-navy-100">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified & Tamper-proof
                </span>
                <span className="font-mono">
                  PASS #{registrationId.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
