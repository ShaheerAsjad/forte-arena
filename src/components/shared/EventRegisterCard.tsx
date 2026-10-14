import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CountdownChip } from "@/components/shared/CountdownChip";
import { formatDeadline } from "@/lib/dates";
import {
  Clock,
  Users,
  User,
  ArrowRight,
  Lock,
  Calendar,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import type { EventWithDerivedStatus } from "@/features/events/services/events.service";
import type { EventDetailItem } from "@/features/events/repositories/events.repository";

const REGISTRATION_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending Review", className: "bg-warning-bg text-warning border-warning/20" },
  APPROVED: { label: "Approved", className: "bg-success-bg text-success border-success/20" },
  REJECTED: { label: "Rejected", className: "bg-danger-bg text-danger border-danger/20" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-navy-100 text-mist border-navy-200" },
};

interface EventRegisterCardProps {
  event: EventWithDerivedStatus<EventDetailItem>;
  isLoggedIn: boolean;
  existingRegistration?: { id: string; status: string } | null;
}

export function EventRegisterCard({
  event,
  isLoggedIn,
  existingRegistration,
}: EventRegisterCardProps) {
  const { item, derivedStatus, remainingSeats } = event;

  const isRegistrationOpen =
    derivedStatus === "Registration Open" || derivedStatus === "Closing Soon";

  const registerHref = `/events/${item.slug}/register`;
  const loginHref = `/login?next=${encodeURIComponent(registerHref)}`;

  // Already registered — show status
  if (existingRegistration) {
    const statusMeta = REGISTRATION_STATUS_STYLES[existingRegistration.status] ??
      REGISTRATION_STATUS_STYLES.PENDING;

    return (
      <Card className="sticky top-24 p-6 sm:p-7 space-y-5 border border-navy-100 shadow-xl bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <p className="font-bold text-navy-950">Already Registered</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold border ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>
        <p className="text-sm text-mist">
          Your registration is being reviewed by the organisers.
        </p>
        <Link href={`/dashboard/${existingRegistration.id}`} className="block">
          <Button variant="primary" size="lg" className="w-full">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            View Registration
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 p-6 sm:p-7 space-y-6 border border-navy-100 shadow-xl bg-white/95 backdrop-blur-md">
      {/* Header status & countdown */}
      <div className="space-y-3 pb-5 border-b border-navy-100">
        <span className="text-xs font-bold uppercase tracking-wider text-mist">
          Registration Deadline
        </span>
        <div className="text-base font-bold text-navy-950 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-500 shrink-0" />
          <span>{formatDeadline(item.registrationDeadline)}</span>
        </div>

        {isRegistrationOpen ? (
          <div className="pt-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <CountdownChip targetDate={item.registrationDeadline} />
          </div>
        ) : (
          <p className="text-xs font-semibold text-danger">
            Registration has closed for this event.
          </p>
        )}
      </div>

      {/* Participation & Seats Info */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-ink/80">
          <span className="flex items-center gap-2 text-mist">
            {item.participationType === "TEAM" ? (
              <Users className="w-4 h-4 text-navy-700" />
            ) : (
              <User className="w-4 h-4 text-navy-700" />
            )}
            Format:
          </span>
          <span className="font-semibold text-navy-950">
            {item.participationType === "TEAM"
              ? `Team (${item.minTeamSize}-${item.maxTeamSize} members)`
              : "Individual (Solo)"}
          </span>
        </div>

        {remainingSeats !== null && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mist font-medium">Availability</span>
              <span className="font-bold text-navy-950">
                {remainingSeats === 0 ? "Event Full" : `${remainingSeats} spots remaining`}
              </span>
            </div>
            {item.maxParticipants && item.maxParticipants > 0 && (
              <div className="w-full bg-navy-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gold-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((item._count.registrations) / item.maxParticipants) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA Button Action */}
      <div className="space-y-2.5 pt-2">
        {!isRegistrationOpen ? (
          <Button disabled variant="outline" className="w-full py-6 text-base cursor-not-allowed">
            <Lock className="w-4 h-4 mr-2" />
            Registration Closed
          </Button>
        ) : remainingSeats === 0 ? (
          <Button disabled variant="outline" className="w-full py-6 text-base cursor-not-allowed">
            Event Capacity Reached
          </Button>
        ) : isLoggedIn ? (
          <Link href={registerHref} className="block w-full">
            <Button variant="gold" size="lg" className="w-full py-6 text-base shadow-md shadow-gold-500/25">
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        ) : (
          <Link href={loginHref} className="block w-full">
            <Button variant="primary" size="lg" className="w-full py-6 text-base">
              <span>Sign In to Register</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        )}

        <p className="text-center text-[11px] text-mist">
          Instant submission • Fast organiser review
        </p>
      </div>
    </Card>
  );
}
