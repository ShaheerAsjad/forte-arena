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
      title="Festival Results & Champions"
      description="Official standings, award announcements, and verified certificates from completed arenas."
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
            <Button variant="gold" size="sm">
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
              className="group block focus:outline-none h-full"
            >
              <Card
                hoverable
                className="h-full flex flex-col justify-between p-6 bg-white border border-navy-100 space-y-6 hover:-translate-y-1 hover:border-gold-400/80 hover:shadow-lg transition-all duration-300"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="gold" size="sm">
                    Results Published
                  </Badge>
                  <span className="text-mist font-semibold">
                    {ev.category}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-bold text-navy-950 group-hover:text-navy-700 transition-colors line-clamp-2">
                  {ev.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-mist pt-1">
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
              <div className="pt-3 border-t border-navy-100 space-y-2 text-xs">
                {first && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/80 border border-amber-200/60 font-semibold text-navy-950">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <Trophy className="w-3.5 h-3.5" />
                      1st Place
                    </span>
                    <span className="truncate max-w-[140px] text-[11px] text-mist">
                      {first.award || "Winner"}
                    </span>
                  </div>
                )}
                {second && (
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 text-ink/80 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Medal className="w-3.5 h-3.5" />
                      2nd Place
                    </span>
                    <span className="truncate max-w-[140px] text-mist">
                      {second.award || "Runner Up"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs font-bold text-navy-900 group-hover:text-navy-700 transition-colors">
                <span>View Full Standings</span>
                <span className="w-6 h-6 rounded-full bg-navy-50 border border-navy-200/60 group-hover:bg-gold-500 group-hover:border-gold-400 group-hover:text-navy-950 flex items-center justify-center transition-all duration-200">
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
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-6 space-y-4 bg-white">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </Card>
      ))}
    </div>
  );
}
