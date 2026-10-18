import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { WithdrawButton } from "@/features/registrations/WithdrawButton";
import { formatTime24 } from "@/lib/dates";
import {
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Calendar,
  MapPin,
  Star,
  QrCode,
} from "lucide-react";
import type { RegistrationCard } from "@/features/registrations/repositories/registrations.repository";
import type { RegistrationStatus } from "@/lib/db-types";
import { getEffectiveStatus } from "@/features/events/events.derived";

// ────────────────────────────────────────────────────────────────
// Status timeline definition
// ────────────────────────────────────────────────────────────────

const STATUS_TIMELINE: Array<{
  label: string;
  statuses: RegistrationStatus[];
  icon: typeof Circle;
}> = [
  { label: "Submitted", statuses: ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"], icon: Circle },
  { label: "Under Review", statuses: ["APPROVED", "REJECTED"], icon: Clock },
  { label: "Decision", statuses: ["APPROVED", "REJECTED"], icon: CheckCircle2 },
];

function StatusTimeline({ status }: { status: RegistrationStatus }) {
  if (status === "WITHDRAWN") {
    return (
      <div className="flex items-center gap-2 text-mist text-xs font-medium">
        <XCircle className="w-4 h-4" /> Withdrawn
      </div>
    );
  }

  const stepDone: Record<string, boolean> = {
    Submitted: true,
    "Under Review": status === "APPROVED" || status === "REJECTED",
    Decision: status === "APPROVED" || status === "REJECTED",
  };

  return (
    <div className="flex items-center gap-1.5">
      {STATUS_TIMELINE.map((step, idx) => {
        const done = stepDone[step.label];
        const isDecision = step.label === "Decision";
        const isApproved = status === "APPROVED";
        const isRejected = status === "REJECTED";

        return (
          <div key={step.label} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {isDecision && done ? (
                isRejected ? (
                  <XCircle className="w-4 h-4 text-danger" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )
              ) : done ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <Circle className="w-4 h-4 text-navy-200" />
              )}
              <span
                className={`text-[10px] font-semibold hidden sm:inline ${
                  done
                    ? isDecision && isRejected
                      ? "text-danger"
                      : "text-success"
                    : "text-mist"
                }`}
              >
                {isDecision && done ? (isApproved ? "Approved" : "Rejected") : step.label}
              </span>
            </div>
            {idx < STATUS_TIMELINE.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded-full ${done ? "bg-success" : "bg-navy-100"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Status badge pill
// ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "bg-warning-bg text-warning border-warning/20",
  APPROVED: "bg-success-bg text-success border-success/20",
  REJECTED: "bg-danger-bg text-danger border-danger/20",
  WITHDRAWN: "bg-navy-100 text-mist border-navy-200",
};

// ────────────────────────────────────────────────────────────────
// RegistrationCard
// ────────────────────────────────────────────────────────────────

interface RegistrationCardProps {
  registration: RegistrationCard;
}

export function RegistrationCard({ registration }: RegistrationCardProps) {
  const { event, status, team, createdAt } = registration;

  return (
    <Card className="p-5 bg-white border border-navy-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/${registration.id}`}
            className="group inline-flex items-center gap-1.5"
          >
            <h3 className="font-bold text-navy-950 group-hover:text-navy-700 transition-colors line-clamp-1 font-heading">
              {event.title}
            </h3>
            <ArrowUpRight className="w-3.5 h-3.5 text-mist group-hover:text-navy-700 transition-colors shrink-0" />
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs text-mist">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.venue}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(event.startsAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {registration.attendedAt && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Attended</span>
            </span>
          )}
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[status]}`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Team name if applicable */}
      {team && (
        <p className="text-xs text-mist font-medium">
          Team: <span className="font-bold text-navy-950">{team.name}</span> ·{" "}
          {team.members.length} {team.members.length === 1 ? "member" : "members"}
        </p>
      )}

      {/* Timeline */}
      <StatusTimeline status={status} />

      {/* QR Entry Pass CTA for Approved Registrations */}
      {status === "APPROVED" && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-navy-950 to-navy-900 border border-gold-400/30 flex items-center justify-between gap-3 text-ivory shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold-400 text-navy-950 flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-ivory truncate">
                Official Entry Pass
              </p>
              <p className="text-[10px] text-mist/90">
                {registration.attendedAt
                  ? `Checked in at ${formatTime24(registration.attendedAt)}`
                  : "Show QR code at venue entrance"}
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/pass/${registration.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gold-400 hover:bg-gold-300 text-navy-950 transition-colors shadow-2xs shrink-0 font-heading"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Show QR Pass</span>
          </Link>
        </div>
      )}

      {/* Published Result & Certificate */}
      {event.resultsPublished && registration.result && (
        <div className="p-3 rounded-xl bg-gold-50/70 border border-gold-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold-400 text-navy-950 flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-2xs">
              #{registration.result.position}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-navy-950 truncate">
                Position #{registration.result.position}
                {registration.result.award ? ` (${registration.result.award})` : ""}
              </p>
              <p className="text-[10px] text-mist">Official Event Result</p>
            </div>
          </div>

          <Link
            href={`/results/${event.slug}/certificate/${registration.result.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-navy-950 hover:bg-navy-900 text-ivory transition-colors shadow-2xs shrink-0"
          >
            <span>View Certificate</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gold-400" />
          </Link>
        </div>
      )}

      {/* Event Feedback Prompt */}
      {status === "APPROVED" && getEffectiveStatus(event) === "COMPLETED" && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gold-50/70 border border-gold-200/80 text-xs">
          <div className="flex items-center gap-2 text-navy-950 font-medium">
            <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500 shrink-0" />
            <span>How was the competition?</span>
          </div>
          <Link
            href={`/dashboard/${registration.id}#feedback`}
            className="font-bold text-navy-950 hover:text-gold-700 underline underline-offset-2 flex items-center gap-1 shrink-0"
          >
            <span>Rate & review</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-navy-50">
        <p className="text-[10px] text-mist">
          Registered{" "}
          {new Date(createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
        <WithdrawButton
          registrationId={registration.id}
          status={status}
          registrationDeadline={new Date(event.registrationDeadline)}
        />
      </div>
    </Card>
  );
}
