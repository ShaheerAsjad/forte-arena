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
      <p className="text-xs font-bold text-navy-900 dark:text-slate-300 uppercase tracking-wider">
        Scored Events &amp; Placements
      </p>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", gridClassName)}>
        {breakdown.map((b) => (
          <div
            key={`${b.eventId}-${b.position}-${b.points}`}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs min-w-0"
          >
            <div className="min-w-0 space-y-1 w-full">
              <Link
                href={`/results/${b.eventSlug}`}
                className="font-bold text-navy-950 dark:text-white hover:text-navy-700 dark:hover:text-gold-400 transition-colors flex items-center gap-1.5"
                title={b.eventTitle}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate max-w-full">{b.eventTitle}</span>
                <ExternalLink className="w-3 h-3 text-mist shrink-0" />
              </Link>

              <div className="flex items-center gap-2 text-mist dark:text-slate-400 text-[11px] flex-wrap">
                {b.teamName && (
                  <span className="flex items-center gap-1 text-ink/70 dark:text-slate-300">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[150px]" title={b.teamName}>{b.teamName}</span>
                  </span>
                )}
                {b.award && (
                  <span className="truncate max-w-[180px]" title={b.award}>
                    • {b.award}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-navy-50 dark:border-slate-800/80">
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
              <span className="font-extrabold text-navy-950 dark:text-white whitespace-nowrap">
                +{b.points} {b.points === 1 ? "pt" : "pts"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
