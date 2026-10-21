import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { EventResultBreakdown } from "../leaderboard.service";
import { Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardBreakdownListProps {
  breakdown: EventResultBreakdown[];
  className?: string;
  gridClassName?: string;
}

export function LeaderboardBreakdownList({
  breakdown,
  className,
  gridClassName,
}: LeaderboardBreakdownListProps) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-xs font-bold text-navy-900 uppercase tracking-wider">
        Scored Events & Placements
      </p>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", gridClassName)}>
        {breakdown.map((b) => (
          <div
            key={`${b.eventId}-${b.position}-${b.points}`}
            className="p-3 rounded-2xl bg-white border border-navy-100 flex items-center justify-between gap-3 text-xs shadow-2xs"
          >
            <div className="min-w-0 space-y-1">
              <Link
                href={`/results/${b.eventSlug}`}
                className="font-bold text-navy-950 hover:text-navy-700 transition-colors flex items-center gap-1 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{b.eventTitle}</span>
                <ExternalLink className="w-3 h-3 text-mist shrink-0" />
              </Link>

              <div className="flex items-center gap-2 text-mist text-[11px]">
                {b.teamName && (
                  <span className="flex items-center gap-1 text-ink/70">
                    <Users className="w-3 h-3" />
                    {b.teamName}
                  </span>
                )}
                {b.award && <span className="truncate">• {b.award}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={
                  b.position === 1
                    ? "gold"
                    : b.position === 2
                    ? "navy"
                    : "warning"
                }
                size="sm"
              >
                {b.position === 1
                  ? "1st Place"
                  : b.position === 2
                  ? "2nd Place"
                  : "3rd Place"}
              </Badge>
              <span className="font-extrabold text-navy-950">
                +{b.points} {b.points === 1 ? "pt" : "pts"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
