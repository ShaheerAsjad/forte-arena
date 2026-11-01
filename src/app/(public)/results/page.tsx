import { Suspense } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ResultsService } from "@/features/results/services/results.service";
import { formatEventDate } from "@/lib/dates";
import { Trophy, Medal, ArrowRight, Calendar, MapPin } from "lucide-react";

export default function ResultsIndexPage() {
  return (
    <PageShell
      badge="Championship Standings"
      title="Festival Results & Champions"
      description="Official standings, award announcements, and verified certificates from completed arenas."
      action={
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gold-400/20 hover:bg-gold-400/30 text-navy-950 border border-gold-400/40 shadow-2xs transition-colors"
        >
          <Trophy className="w-3.5 h-3.5 text-gold-600" />
          <span>View Overall Leaderboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <div className="space-y-8 pb-16">
        <Suspense fallback={<ResultsListSkeleton />}>
          <ResultsListLoader />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function ResultsListLoader() {
  const events = await ResultsService.getPublishedResultsEvents();

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="w-10 h-10 text-mist" />}
        title="No Published Results Yet"
        description="Official results and podium placements will appear here once competitions finish and judges publish rankings."
        action={
          <Link href="/events">
            <Button variant="gold" size="sm" withArrow>
              Explore Live Events
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {events.map((ev) => {
        const first = ev.results.find((r) => r.position === 1);
        const second = ev.results.find((r) => r.position === 2);

        return (
          <StaggerItem key={ev.id}>
            <Link
              href={`/results/${ev.slug}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 rounded-2xl h-full"
            >
              <Card
                hoverable
                className="h-full flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 space-y-6 hover:-translate-y-1 hover:border-gold-400/80 hover:shadow-lg active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 transition-all duration-200"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="gold" size="sm">
                    Results Published
                  </Badge>
                  <span className="text-mist dark:text-slate-400 font-semibold">
                    {ev.category}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-bold text-navy-950 dark:text-white group-hover:text-navy-700 dark:group-hover:text-gold-300 transition-colors line-clamp-2">
                  {ev.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-mist dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatEventDate(ev.startsAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {ev.venue}
                  </span>
                </div>
              </div>

              {/* Podium Preview Strip */}
              <div className="pt-3 border-t border-navy-100 dark:border-slate-800 space-y-2 text-xs">
                {first && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 font-semibold text-navy-950 dark:text-amber-200 min-w-0">
                    <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 shrink-0">
                      <Trophy className="w-3.5 h-3.5" />
                      1st Place
                    </span>
                    <span
                      className="truncate min-w-0 flex-1 text-right text-[11px] text-mist dark:text-slate-400"
                      title={first.award || "Winner"}
                    >
                      {first.award || "Winner"}
                    </span>
                  </div>
                )}
                {second && (
                  <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-ink/80 dark:text-slate-200 text-[11px] min-w-0">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold shrink-0">
                      <Medal className="w-3.5 h-3.5" />
                      2nd Place
                    </span>
                    <span
                      className="truncate min-w-0 flex-1 text-right text-mist dark:text-slate-400"
                      title={second.award || "Runner Up"}
                    >
                      {second.award || "Runner Up"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs font-bold text-navy-900 dark:text-slate-200 group-hover:text-navy-700 dark:group-hover:text-gold-400 transition-colors">
                <span>View Full Standings</span>
                <span className="w-6 h-6 rounded-full bg-navy-50 dark:bg-slate-800 border border-navy-200/60 dark:border-slate-700 group-hover:bg-gold-500 group-hover:border-gold-400 group-hover:text-navy-950 flex items-center justify-center transition-all duration-200">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-current" />
                </span>
              </div>
            </Card>
          </Link>
        </StaggerItem>
      );
    })}
  </Stagger>
  );
}

function ResultsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className="h-full flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 space-y-6"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-5 w-3/5 rounded-md" />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </div>

          {/* Podium preview strip skeleton */}
          <div className="pt-3 border-t border-navy-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
            <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40">
              <Skeleton className="h-3.5 w-18 rounded-md" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-navy-50 dark:border-slate-800/60">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
