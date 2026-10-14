import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResultsPodium } from "@/components/shared/ResultsPodium";
import { ResultsService } from "@/features/results/services/results.service";
import { formatEventDate } from "@/lib/dates";
import { ArrowLeft, Trophy, Calendar, MapPin } from "lucide-react";

interface EventResultsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventResultsPage({ params }: EventResultsPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-10 pb-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
      {/* Back button */}
      <div>
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-mist hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Results</span>
        </Link>
      </div>

      <Suspense fallback={<ResultsDetailSkeleton />}>
        <EventResultsLoader slug={slug} />
      </Suspense>
    </div>
  );
}

async function EventResultsLoader({ slug }: { slug: string }) {
  const event = await ResultsService.getEventResults(slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-12">
      {/* Event Header Banner */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border border-navy-800 shadow-xl space-y-5 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-400/20 text-gold-400 text-xs font-bold border border-gold-400/30">
          <Trophy className="w-4 h-4" />
          <span>Official Competition Results</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-black text-ivory max-w-3xl mx-auto leading-tight">
          {event.title}
        </h1>

        <p className="text-sm sm:text-base text-ivory/80 max-w-2xl mx-auto">
          {event.summary}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-white/10 text-xs text-ivory/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gold-400" />
            {formatEventDate(event.startsAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gold-400" />
            {event.venue}
          </span>
          <Badge variant="navy">{event.category}</Badge>
        </div>
      </div>

      {/* Podium & Full Standings */}
      <ResultsPodium results={event.results} />
    </div>
  );
}

function ResultsDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Card className="h-64 bg-navy-900 rounded-3xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
