import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { EventResultBreakdown } from "../leaderboard.service";
import { getBreakdownGridClass } from "../leaderboard.config";
import { Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardBreakdownListProps {
  breakdown: EventResultBreakdown[];
  className?: string;
  columns?: 1 | 2;
  gridClassName?: string;
}

export function LeaderboardBreakdownList({
  breakdown,
  className,
  columns,
  gridClassName,
}: LeaderboardBreakdownListProps) {
  if (breakdown.length === 0) {
    return null;
  }

  const gridClass = getBreakdownGridClass(columns, gridClassName);

  return (
    <div className={cn("space-y-2.5 min-w-0 w-full", className)}>
      <p className="text-xs font-bold text-navy-900 dark:text-slate-300 uppercase tracking-wider">
        Scored Events &amp; Placements
      </p>
      <div className={gridClass}>
        {breakdown.map((b) => (
          <div
            key={`${b.eventId}-${b.position}-${b.points}`}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-2.5 text-xs shadow-2xs min-w-0 w-full"
          >
            {/* Event Info (Left / Top when wrapped) */}
            <div className="min-w-0 flex-1 basis-36 space-y-1">
              <Link
                href={`/results/${b.eventSlug}`}
                className="font-bold text-navy-950 dark:text-white hover:text-navy-700 dark:hover:text-gold-400 transition-colors inline-flex items-center gap-1.5 max-w-full"
                title={b.eventTitle}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="line-clamp-2 break-words">{b.eventTitle}</span>
                <ExternalLink className="w-3 h-3 text-mist shrink-0" />
              </Link>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-mist dark:text-slate-400 text-[11px]">
                {b.teamName && (
                  <span className="flex items-center gap-1 text-ink/70 dark:text-slate-300 min-w-0">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="break-words max-w-[150px]" title={b.teamName}>
                      {b.teamName}
                    </span>
                  </span>
                )}
                {b.award && (
                  <span className="break-words max-w-full" title={b.award}>
                    {b.teamName ? "• " : ""}
                    {b.award}
                  </span>
                )}
              </div>
            </div>

            {/* Placement Badge & Points (Right / Wrapped under when narrow) */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5 self-start">
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
              <span className="font-extrabold text-navy-950 dark:text-white whitespace-nowrap text-xs">
                +{b.points} {b.points === 1 ? "pt" : "pts"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
