import { Suspense } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { EventsFilterBar } from "@/components/shared/EventsFilterBar";
import { EventCard } from "@/components/shared/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { EventsService } from "@/features/events/services/events.service";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { EventCategory, EventStatus } from "@/lib/db-types";

interface EventsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
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
        {/* Interactive Filter Bar */}
        <Suspense fallback={<div className="h-20 bg-white rounded-2xl animate-pulse" />}>
          <EventsFilterBar />
        </Suspense>

        {/* Suspenseful Events Grid */}
        <Suspense fallback={<EventsListSkeleton />}>
          <EventsGridLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}

// -------------------------------------------------------------
// Async Events Loader
// -------------------------------------------------------------

async function EventsGridLoader({
  searchParams,
}: {
  searchParams: EventsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const category =
    params.category && params.category !== "ALL"
      ? (params.category as EventCategory)
      : undefined;
  const status = params.status ? (params.status as EventStatus) : undefined;
  const search = params.q || undefined;

  const result = await EventsService.getPaginatedEvents({
    page,
    pageSize: 9,
    category,
    status,
    search,
  });

  const { events, total, totalPages, currentPage } = result;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-10 h-10 text-mist" />}
        title="No Competitions Found"
        description="We couldn't find any events matching your selected search criteria or filters."
        action={
          <Link href="/events">
            <Button variant="outline" size="sm">
              Clear Filters
            </Button>
          </Link>
        }
      />
    );
  }

  // Construct pagination URL generator
  const createPageUrl = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category && params.category !== "ALL") sp.set("category", params.category);
    if (params.status) sp.set("status", params.status);
    sp.set("page", String(targetPage));
    return `/events?${sp.toString()}`;
  };

  return (
    <div className="space-y-10">
      {/* Result Count Status */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-mist px-1">
        <span>
          Showing <span className="font-bold text-navy-950">{events.length}</span> of{" "}
          <span className="font-bold text-navy-950">{total}</span> competitions
        </span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Grid */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {events.map((event) => (
          <StaggerItem key={event.item.id}>
            <EventCard event={event} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-navy-100">
          {currentPage > 1 ? (
            <Link href={createPageUrl(currentPage - 1)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled className="gap-1 opacity-50 cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
          )}

          <div className="flex items-center gap-1.5 px-3 text-xs sm:text-sm font-semibold text-navy-950">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isCurrent = p === currentPage;
              return (
                <Link key={p} href={createPageUrl(p)}>
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                      isCurrent
                        ? "bg-navy-900 text-ivory shadow-xs"
                        : "hover:bg-navy-100 text-ink/70"
                    }`}
                  >
                    {p}
                  </span>
                </Link>
              );
            })}
          </div>

          {currentPage < totalPages ? (
            <Link href={createPageUrl(currentPage + 1)}>
              <Button variant="outline" size="sm" className="gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled className="gap-1 opacity-50 cursor-not-allowed">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-48 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card
            key={i}
            className="h-full flex flex-col overflow-hidden border border-navy-100 bg-white"
          >
            {/* Poster area skeleton */}
            <div className="relative w-full aspect-16/10 bg-navy-100/70 animate-pulse">
              <div className="absolute top-3 left-3 w-12 h-14 rounded-xl bg-white/70 shadow-sm" />
              <div className="absolute top-3 right-3 w-20 h-6 rounded-full bg-white/70" />
              <div className="absolute bottom-3 left-3 w-24 h-6 rounded-lg bg-navy-950/25" />
            </div>

            {/* Content body skeleton */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
              </div>

              <div className="space-y-2.5 pt-3 border-t border-navy-50">
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
