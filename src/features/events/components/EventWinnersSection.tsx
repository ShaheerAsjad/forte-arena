import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { RankedResultItem } from "@/features/results/repositories/results.repository";
import {
  Trophy,
  Medal,
  Award,
  Users,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChildCompetitionWinners {
  slug: string;
  title: string;
  subHeading: string;
  results: RankedResultItem[];
}

export interface EventWinnersSectionProps {
  eventTitle: string;
  eventSlug: string;
  results: RankedResultItem[];
  childCompetitions?: ChildCompetitionWinners[];
}

function getMedalStyling(position: number) {
  if (position === 1) {
    return {
      avatarBg:
        "bg-gold-400 dark:bg-gold-500 border-gold-300 dark:border-gold-400 text-navy-950",
      badge: "gold" as const,
      text: "1st Place",
      icon: <Trophy className="w-5 h-5 text-navy-950" />,
    };
  }
  if (position === 2) {
    return {
      avatarBg:
        "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200",
      badge: "navy" as const,
      text: "2nd Place",
      icon: <Medal className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
    };
  }
  if (position === 3) {
    return {
      avatarBg:
        "bg-amber-200 dark:bg-amber-800/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200",
      badge: "warning" as const,
      text: "3rd Place",
      icon: <Award className="w-5 h-5 text-amber-800 dark:text-amber-300" />,
    };
  }
  return {
    avatarBg:
      "bg-navy-100 dark:bg-slate-800 border-navy-200 dark:border-slate-700 text-navy-900 dark:text-slate-300",
    badge: "outline" as const,
    text: `${position}th Place`,
    icon: <span className="font-bold text-xs">#{position}</span>,
  };
}

function WinnerCard({ result }: { result: RankedResultItem }) {
  const styling = getMedalStyling(result.position);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 shadow-xs flex flex-wrap items-start justify-between gap-3 min-w-0 transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1 basis-40">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border",
            styling.avatarBg
          )}
        >
          {styling.icon}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4
            className="font-heading font-bold text-sm sm:text-base text-navy-950 dark:text-white truncate max-w-full"
            title={result.winnerName}
          >
            {result.winnerName}
          </h4>
          {result.teamName && (
            <p
              className="flex items-center gap-1 text-xs text-ink/70 dark:text-slate-300 truncate"
              title={result.teamName}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{result.teamName}</span>
            </p>
          )}
          {result.department && (
            <p
              className="text-[11px] text-mist dark:text-slate-400 truncate"
              title={result.department}
            >
              {result.department}
            </p>
          )}
          {result.award && (
            <p
              className="text-[11px] font-semibold text-gold-700 dark:text-gold-400 line-clamp-2 break-words pt-0.5"
              title={result.award}
            >
              {result.award}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-0.5 self-start">
        <Badge variant={styling.badge} size="sm">
          #{result.position} • {styling.text}
        </Badge>
      </div>
    </div>
  );
}

export function EventWinnersSection({
  eventTitle,
  eventSlug,
  results,
  childCompetitions = [],
}: EventWinnersSectionProps) {
  const hasMainResults = results && results.length > 0;
  const hasChildResults = childCompetitions && childCompetitions.length > 0;

  if (!hasMainResults && !hasChildResults) {
    return null;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 border-t border-navy-100 dark:border-slate-800 space-y-8">
      {/* Main Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/15 dark:bg-gold-500/10 text-gold-700 dark:text-gold-400 text-xs font-bold border border-gold-300/40">
            <Trophy className="w-3.5 h-3.5 text-gold-500" />
            <span>Official Competition Results</span>
          </div>
          <h3
            className="font-heading text-xl sm:text-2xl font-extrabold text-navy-950 dark:text-white"
            title={`Results for ${eventTitle}`}
          >
            Winners &amp; Placements
          </h3>
          <p className="text-xs text-mist dark:text-slate-400 font-medium">
            Official standings for {eventTitle}
          </p>
        </div>

        <Link
          href={`/results/${eventSlug}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-navy-900 dark:text-gold-400 hover:text-navy-700 dark:hover:text-gold-300 transition-colors shrink-0 group self-start sm:self-auto"
        >
          <span>View full results &amp; certificates</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Main Event Winners Grid */}
      {hasMainResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {results.map((r) => (
            <WinnerCard key={r.id} result={r} />
          ))}
        </div>
      )}

      {/* Child Competitions (Related Events under Sub-headings) */}
      {hasChildResults &&
        childCompetitions.map((child) => (
          <div
            key={child.slug}
            className="space-y-4 pt-6 border-t border-navy-100/70 dark:border-slate-800/80"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
                <h4 className="font-heading text-base sm:text-lg font-bold text-navy-950 dark:text-white truncate">
                  <span>{child.subHeading}</span>
                  <span className="text-xs font-normal text-mist dark:text-slate-400 ml-2 hidden sm:inline">
                    ({child.title})
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
                <Link
                  href={`/events/${child.slug}`}
                  className="text-navy-800 dark:text-slate-300 hover:text-navy-950 dark:hover:text-gold-400 inline-flex items-center gap-1"
                >
                  <span>View Event</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-navy-200 dark:text-slate-700">•</span>
                <Link
                  href={`/results/${child.slug}`}
                  className="text-gold-700 dark:text-gold-400 hover:text-gold-800 inline-flex items-center gap-1 font-bold"
                >
                  <span>Full Results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {child.results.map((r) => (
                <WinnerCard key={r.id} result={r} />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
