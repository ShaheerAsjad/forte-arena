import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { RegistrationsRepository } from "@/features/registrations/repositories/registrations.repository";
import { WithdrawButton } from "@/features/registrations/WithdrawButton";
import { Card } from "@/components/ui/Card";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  ExternalLink,
  QrCode,
} from "lucide-react";
import type { RegistrationStatus } from "@/lib/db-types";
import { getEffectiveStatus } from "@/features/events/events.derived";
import { FeedbackRepository } from "@/features/feedback/repositories/feedback.repository";
import { StudentFeedbackCard } from "@/features/feedback/components/StudentFeedbackCard";
import { formatTime24 } from "@/lib/dates";
import { AutoRefresh } from "@/components/shared/AutoRefresh";

interface PageProps {
  params: Promise<{ registrationId: string }>;
}

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "bg-warning-bg text-warning border-warning/20",
  APPROVED: "bg-success-bg text-success border-success/20",
  REJECTED: "bg-danger-bg text-danger border-danger/20",
  WITHDRAWN: "bg-navy-100 text-mist border-navy-200",
};

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

type TimelineStep = {
  label: string;
  description: string;
  icon: typeof Circle;
  done: boolean;
  isRejected?: boolean;
};

function buildTimeline(status: RegistrationStatus): TimelineStep[] {
  const base: TimelineStep[] = [
    {
      label: "Submitted",
      description: "Your registration has been received.",
      icon: Circle,
      done: true,
    },
    {
      label: "Under Review",
      description: "An organiser is reviewing your registration.",
      icon: Clock,
      done: status === "APPROVED" || status === "REJECTED",
    },
    {
      label: status === "REJECTED" ? "Rejected" : "Approved",
      description:
        status === "REJECTED"
          ? "Your registration was not accepted."
          : status === "APPROVED"
          ? "Congratulations! You are accepted."
          : "Decision pending.",
      icon:
        status === "REJECTED"
          ? XCircle
          : status === "APPROVED"
          ? CheckCircle2
          : Circle,
      done: status === "APPROVED" || status === "REJECTED",
      isRejected: status === "REJECTED",
    },
  ];
  return base;
}

async function RegistrationDetailContent({
  registrationId,
}: {
  registrationId: Promise<string> | string;
}) {
  const resolvedId = await Promise.resolve(registrationId);
  const user = await requireUser("/login?next=/dashboard");
  const registration = await RegistrationsRepository.getRegistrationById(
    resolvedId,
    user.id
  );

  if (!registration) notFound();

  const isEventCompleted = getEffectiveStatus(registration.event) === "COMPLETED";
  const canGiveFeedback = registration.status === "APPROVED" && isEventCompleted;

  const existingFeedback = canGiveFeedback
    ? await FeedbackRepository.getUserFeedbackForEvent(user.id, registration.event.id)
    : null;

  const timeline = buildTimeline(registration.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AutoRefresh intervalMs={15000} enabled={!isEventCompleted} />
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-navy-950 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Status Header */}
      <Card className="p-6 sm:p-8 bg-white border border-navy-100 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mist mb-1">
              Registration
            </p>
            <h1 className="text-2xl font-extrabold text-navy-950 font-heading">
              {registration.event.title}
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold border ${STATUS_STYLES[registration.status]}`}
          >
            {STATUS_LABELS[registration.status]}
          </span>
        </div>

        {/* Event details */}
        <div className="flex flex-wrap gap-4 text-sm text-mist">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gold-600 shrink-0" />
            {registration.event.venue}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gold-600 shrink-0" />
            {new Date(registration.event.startsAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* QR Entry Pass CTA for Approved Registrations */}
        {registration.status === "APPROVED" && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-gold-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-ivory shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-400 text-navy-950 flex items-center justify-center font-heading font-black text-sm shrink-0 shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-400">
                  Event Day Check-In
                </p>
                <p className="font-heading text-base font-extrabold text-ivory">
                  Official QR Entry Pass
                </p>
                <p className="text-xs text-mist/90">
                  {registration.attendedAt
                    ? `Checked in at ${formatTime24(registration.attendedAt)}`
                    : "Have your QR pass ready on your device for entry."}
                </p>
              </div>
            </div>

            <Link
              href={`/dashboard/pass/${registration.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gold-400 hover:bg-gold-300 text-navy-950 transition-colors shadow-xs shrink-0 font-heading"
            >
              <QrCode className="w-4 h-4" />
              <span>Show QR Pass</span>
            </Link>
          </div>
        )}

        {/* Published Result & Certificate */}
        {registration.event.resultsPublished && registration.result && (
          <div className="p-4 rounded-2xl bg-gold-50/80 border border-gold-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-400 text-navy-950 flex items-center justify-center font-heading font-black text-sm shrink-0 shadow-sm">
                #{registration.result.position}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-700">
                  Competition Standing
                </p>
                <p className="font-heading text-base font-extrabold text-navy-950">
                  Position #{registration.result.position}
                  {registration.result.award ? ` (${registration.result.award})` : ""}
                </p>
              </div>
            </div>

            <Link
              href={`/results/${registration.event.slug}/certificate/${registration.result.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-navy-950 hover:bg-navy-900 text-ivory transition-colors shadow-xs"
            >
              <span>View Certificate</span>
              <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
            </Link>
          </div>
        )}

        {/* Rejection reason */}
        {registration.status === "REJECTED" && registration.rejectionReason && (
          <div className="p-4 rounded-xl bg-danger-bg border border-danger/20">
            <p className="text-sm font-semibold text-danger mb-1">
              Rejection Reason
            </p>
            <p className="text-sm text-danger/80">
              {registration.rejectionReason}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-mist">
            Status Timeline
          </p>
          <div className="space-y-3">
            {timeline.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        step.done
                          ? step.isRejected
                            ? "bg-danger-bg border border-danger/30"
                            : "bg-success-bg border border-success/30"
                          : "bg-navy-100 border border-navy-200"
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          step.done
                            ? step.isRejected
                              ? "text-danger"
                              : "text-success"
                            : "text-mist"
                        }`}
                      />
                    </div>
                    {idx < timeline.length - 1 && (
                      <div
                        className={`w-0.5 h-6 mt-1 ${
                          step.done ? "bg-success/40" : "bg-navy-100"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-3">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? "text-navy-950" : "text-mist"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-mist">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Withdraw */}
        <div className="pt-2 border-t border-navy-50">
          <WithdrawButton
            registrationId={registration.id}
            status={registration.status}
            registrationDeadline={new Date(registration.event.registrationDeadline)}
          />
        </div>
      </Card>

      {/* Event Feedback Section */}
      {canGiveFeedback && (
        <StudentFeedbackCard
          eventId={registration.event.id}
          eventTitle={registration.event.title}
          initialFeedback={existingFeedback}
        />
      )}

      {/* Team Members */}
      {registration.team && (
        <Card className="p-6 bg-white border border-navy-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-600" />
            <h2 className="font-bold text-navy-950">
              Team: {registration.team.name}
            </h2>
          </div>
          <div className="space-y-2">
            {registration.team.members.map((member, idx) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-navy-50 border border-navy-100"
              >
                <div>
                  <p className="font-semibold text-navy-950 text-sm">
                    {member.fullName}
                    {idx === 0 && (
                      <span className="ml-2 text-[10px] font-bold text-gold-700 bg-gold-100 px-1.5 py-0.5 rounded-full">
                        Leader
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-mist">{member.rollNumber}</p>
                </div>
                {member.email && (
                  <p className="text-xs text-mist hidden sm:block">
                    {member.email}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function RegistrationDetailPage({ params }: PageProps) {
  return (
    <div className="min-h-screen px-4 py-10 sm:px-8 bg-navy-50/40">
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
            <div className="h-6 bg-navy-100 rounded w-32" />
            <div className="h-64 bg-white rounded-2xl border border-navy-100" />
          </div>
        }
      >
        <RegistrationDetailContent registrationId={params.then((p) => p.registrationId)} />
      </Suspense>
    </div>
  );
}
