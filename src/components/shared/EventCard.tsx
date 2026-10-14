import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CountdownChip } from "@/components/shared/CountdownChip";
import { getDateParts } from "@/lib/dates";
import {
  MapPin,
  Users,
  User,
  Sparkles,
  Code2,
  Trophy,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Clock,
} from "lucide-react";
import type { EventWithDerivedStatus } from "@/features/events/services/events.service";
import type { EventCardItem } from "@/features/events/repositories/events.repository";
import type { EventCategory } from "@/lib/db-types";

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; icon: typeof Code2; bg: string; text: string }
> = {
  TECHNICAL: {
    label: "Technical",
    icon: Code2,
    bg: "bg-navy-100 text-navy-900 border-navy-200",
    text: "text-navy-900",
  },
  SPORTS: {
    label: "Sports",
    icon: Trophy,
    bg: "bg-amber-100 text-amber-900 border-amber-200",
    text: "text-amber-900",
  },
  CULTURAL: {
    label: "Cultural",
    icon: Sparkles,
    bg: "bg-purple-100 text-purple-900 border-purple-200",
    text: "text-purple-900",
  },
  ACADEMIC: {
    label: "Academic",
    icon: GraduationCap,
    bg: "bg-blue-100 text-blue-900 border-blue-200",
    text: "text-blue-900",
  },
  GAMING: {
    label: "Gaming",
    icon: Gamepad2,
    bg: "bg-emerald-100 text-emerald-900 border-emerald-200",
    text: "text-emerald-900",
  },
  OTHER: {
    label: "Other",
    icon: HelpCircle,
    bg: "bg-stone-100 text-stone-900 border-stone-200",
    text: "text-stone-900",
  },
};

interface EventCardProps {
  event: EventWithDerivedStatus<EventCardItem>;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const { item, derivedStatus, remainingSeats } = event;
  const categoryMeta = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
  const CategoryIcon = categoryMeta.icon;
  const dateParts = getDateParts(item.startsAt);

  return (
    <Link href={`/events/${item.slug}`} className="group block focus:outline-none">
      <Card
        hoverable
        className={`h-full flex flex-col overflow-hidden border border-navy-100/80 bg-white transition-all duration-300 ${className ?? ""}`}
      >
        {/* Poster Media / Gradient Hero */}
        <div className="relative w-full aspect-16/10 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 overflow-hidden">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CategoryIcon className="w-8 h-8 text-gold-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gold-400/80 font-heading">
                {categoryMeta.label}
              </span>
            </div>
          )}

          {/* Date Stamp Badge (Top Left) */}
          <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-white/95 backdrop-blur-md shadow-md text-navy-950 border border-white/40">
            <span className="text-[10px] font-bold tracking-wider uppercase text-gold-600">
              {dateParts.month}
            </span>
            <span className="text-lg font-black font-heading leading-tight">
              {dateParts.day}
            </span>
          </div>

          {/* Status Badge (Top Right) */}
          <div className="absolute top-3 right-3 shadow-sm">
            <StatusBadge status={derivedStatus} />
          </div>

          {/* Category Chip (Bottom Left) */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-navy-950/80 text-ivory backdrop-blur-md border border-white/20">
              <CategoryIcon className="w-3.5 h-3.5 text-gold-400" />
              <span>{categoryMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-heading text-lg font-bold text-navy-950 group-hover:text-navy-700 transition-colors line-clamp-1">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-mist line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          </div>

          {/* Metadata Row */}
          <div className="space-y-2.5 pt-2 border-t border-navy-50">
            <div className="flex items-center justify-between text-xs text-ink/80 font-medium">
              <span className="inline-flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span className="truncate">{item.venue}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 shrink-0 text-mist">
                {item.participationType === "TEAM" ? (
                  <>
                    <Users className="w-3.5 h-3.5 text-navy-600" />
                    <span>Team ({item.minTeamSize}-{item.maxTeamSize})</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-navy-600" />
                    <span>Solo</span>
                  </>
                )}
              </span>
            </div>

            {/* Countdown / Seats Left Row */}
            <div className="flex items-center justify-between pt-1 text-[11px]">
              {derivedStatus === "Registration Open" || derivedStatus === "Closing Soon" ? (
                <div className="flex items-center gap-1 text-ink/70">
                  <Clock className="w-3.5 h-3.5 text-gold-600" />
                  <CountdownChip targetDate={item.registrationDeadline} />
                </div>
              ) : (
                <span className="text-mist font-medium">Registration Closed</span>
              )}

              {remainingSeats !== null && (
                <span className="text-mist font-semibold">
                  {remainingSeats === 0 ? (
                    <span className="text-danger font-bold">Full</span>
                  ) : (
                    <span>{remainingSeats} seats left</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
