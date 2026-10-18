"use client";

import { useState } from "react";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  Users,
  ShieldCheck,
  Sparkles,
  Layers,
  UserCheck,
} from "lucide-react";
import { formatTime24 } from "@/lib/dates";

interface TeamMemberPass {
  id: string;
  fullName: string;
  rollNumber: string;
  email: string | null;
  phone: string | null;
  qrDataUrl: string;
  attendedAt: Date | string | null;
  isLeader: boolean;
}

interface TeamPassClientProps {
  registrationId: string;
  event: {
    title: string;
    venue: string;
    status?: string;
  };
  eventDateStr: string;
  eventTimeStr: string;
  team: {
    id: string;
    name: string;
    members: TeamMemberPass[];
  };
  isEventAttendanceOpen: boolean;
}

export function TeamPassClient({
  registrationId,
  event,
  eventDateStr,
  eventTimeStr,
  team,
  isEventAttendanceOpen,
}: TeamPassClientProps) {
  const [activeMemberId, setActiveMemberId] = useState<string>(
    team.members[0]?.id || ""
  );
  const [showAllStacked, setShowAllStacked] = useState(false);

  const activeMember =
    team.members.find((m) => m.id === activeMemberId) || team.members[0];

  const attendedCount = team.members.filter((m) => m.attendedAt !== null).length;

  const renderTicket = (member: TeamMemberPass) => {
    return (
      <div
        key={member.id}
        className="relative bg-white rounded-3xl shadow-xl border border-navy-100 overflow-hidden"
      >
        {/* Top Ticket Header (Navy / Gold) */}
        <div className="bg-navy-950 text-ivory p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gold-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-gold-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-gold-400 text-xs font-extrabold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Team Member Entry Pass</span>
              </div>

              {member.attendedAt ? (
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

            <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight leading-tight">
              {event.title}
            </h2>

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

        {/* Ticket Middle: Member QR Code */}
        <div className="px-6 py-6 sm:p-7 flex flex-col items-center justify-center text-center space-y-4 bg-white">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-navy-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.qrDataUrl}
              alt={`${member.fullName}'s Entry QR Code`}
              width={260}
              height={260}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Show at entry desk
            </p>
            <p className="text-[11px] text-mist max-w-xs">
              Personal pass for {member.fullName}. Present this code at the registration desk.
            </p>
          </div>

          {member.attendedAt && (
            <div className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Checked in at {formatTime24(member.attendedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Ticket Lower Section: Member & Team Details */}
        <div className="bg-navy-50/60 p-6 sm:p-7 border-t border-navy-100 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                Participant Name
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-navy-950 truncate flex items-center gap-1.5">
                <span>{member.fullName}</span>
                {member.isLeader && (
                  <span className="text-[10px] font-bold text-gold-700 bg-gold-100 px-1.5 py-0.2 rounded-full border border-gold-300">
                    Leader
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                Roll Number
              </p>
              <p className="text-xs sm:text-sm font-mono font-bold text-navy-950">
                {member.rollNumber}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                Team
              </p>
              <p className="text-xs font-semibold text-navy-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gold-600" />
                <span>{team.name}</span>
              </p>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="pt-2 flex items-center justify-between text-[10px] text-mist border-t border-navy-100">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified & Tamper-proof
            </span>
            <span className="font-mono">
              REG #{registrationId.slice(0, 6).toUpperCase()} · #{member.id.slice(-4).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Member Selector Bar */}
      <div className="p-3 bg-white rounded-2xl border border-navy-100 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-navy-950">
            <Users className="w-4 h-4 text-gold-600" />
            <span>Team Members ({team.members.length})</span>
          </div>
          <span className="text-[11px] font-semibold text-mist">
            {attendedCount}/{team.members.length} checked in
          </span>
        </div>

        {/* Member Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {team.members.map((m) => {
            const isSelected = m.id === activeMember.id && !showAllStacked;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setShowAllStacked(false);
                  setActiveMemberId(m.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-navy-950 text-white shadow-xs"
                    : "bg-navy-50 hover:bg-navy-100 text-navy-800 border border-navy-200/70"
                }`}
              >
                {m.attendedAt ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-mist" />
                )}
                <span>{m.fullName.split(" ")[0]}</span>
                {m.isLeader && (
                  <span className="text-[9px] font-extrabold uppercase text-gold-400">
                    Lead
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAllStacked(!showAllStacked)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              showAllStacked
                ? "bg-navy-950 text-white shadow-xs"
                : "bg-navy-50 hover:bg-navy-100 text-navy-800 border border-navy-200/70"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-gold-600" />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* Render Active Ticket or Stacked Tickets */}
      {showAllStacked ? (
        <div className="space-y-6">
          {team.members.map((member) => renderTicket(member))}
        </div>
      ) : (
        renderTicket(activeMember)
      )}
    </div>
  );
}
