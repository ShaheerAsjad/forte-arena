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

export default function EventResultsPage({ params }: EventResultsPageProps) {
  return (
    <div className="relative space-y-10 pb-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4 overflow-hidden">
      {/* Ambient Navy/Gold Mesh Backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.22),rgba(0,25,105,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(98,136,237,0.16),transparent_65%)] blur-3xl" />
      </div>

      {/* Blueprint Grid Texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

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
        <EventResultsLoader params={params} />
      </Suspense>
    </div>
  );
}

async function EventResultsLoader({ params }: EventResultsPageProps) {
  const { slug } = await params;
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
