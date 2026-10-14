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

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

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
        <Suspense
          key={JSON.stringify(params)}
          fallback={<EventsListSkeleton />}
        >
          <EventsGridLoader params={params} />
        </Suspense>
      </div>
    </PageShell>
  );
}

// -------------------------------------------------------------
// Async Events Loader
// -------------------------------------------------------------

async function EventsGridLoader({
  params,
}: {
  params: { q?: string; category?: string; status?: string; page?: string };
}) {
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
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-4 bg-white">
            <Skeleton className="aspect-16/10 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
