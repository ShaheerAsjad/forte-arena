import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { EventsExplorerClient } from "@/features/events/components/EventsExplorerClient";
import { EventsService } from "@/features/events/services/events.service";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Festival Competitions & Arenas | Forté Arena",
  description:
    "Discover upcoming tournaments, hackathons, showcases, and athletic events across campus.",
};

interface EventsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    type?: string;
    sort?: string;
  }>;
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  return (
    <PageShell
      badge="Festival Schedule"
      title="Festival Competitions & Arenas"
      description="Discover upcoming tournaments, hackathons, showcases, and athletic events across campus."
    >
      <div className="space-y-8 pb-16">
        <Suspense fallback={<EventsListSkeleton />}>
          <EventsDirectory searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function EventsDirectory({
  searchParams,
}: {
  searchParams: EventsPageProps["searchParams"];
}) {
  const [params, events] = await Promise.all([
    searchParams,
    EventsService.getAllPublicEvents(),
  ]);

  return <EventsExplorerClient events={events} initialParams={params} />;
}

function EventsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search & Filter Bar Skeleton */}
      <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-navy-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="flex items-center gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-xl shrink-0" />
          ))}
        </div>
        <div className="hidden md:grid md:grid-cols-3 gap-3 pt-2 border-t border-navy-50 dark:border-slate-800">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-48 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            className="h-full flex flex-col overflow-hidden border border-navy-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-0"
          >
            {/* Poster area skeleton */}
            <div className="relative w-full aspect-16/10 bg-navy-100/70 dark:bg-slate-800/80">
              <div className="absolute top-3 left-3 w-12 h-14 rounded-xl bg-white/70 dark:bg-slate-700/70 shadow-sm" />
              <div className="absolute top-3 right-3 w-20 h-6 rounded-full bg-white/70 dark:bg-slate-700/70" />
              <div className="absolute bottom-3 left-3 w-24 h-6 rounded-lg bg-navy-950/25 dark:bg-slate-900/60" />
            </div>

            {/* Content body skeleton */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
              </div>

              <div className="space-y-2.5 pt-3 border-t border-navy-50 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
