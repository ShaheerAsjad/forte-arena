import { Suspense } from "react";
import type { Metadata } from "next";
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

export async function generateMetadata({
  params,
}: EventResultsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await ResultsService.getEventResults(slug);
  if (!event) {
    return {
      title: "Results Not Found | Forte Arena",
    };
  }

  const title = `${event.title} - Official Results | Forte Arena`;
  const description =
    event.summary ||
    `Official competition results and podium standings for ${event.title} at Forte Arena.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/results/${slug}`,
      siteName: "Forte Arena",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
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
      <ResultsPodium results={event.results} eventSlug={event.slug} />
    </div>
  );
}

function ResultsDetailSkeleton() {
  return (
    <div className="space-y-12">
      {/* Event Header Banner Skeleton */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border border-navy-800 shadow-xl space-y-5 text-center relative overflow-hidden">
        <div className="flex justify-center">
          <Skeleton className="h-6 w-48 rounded-full bg-navy-800/80" />
        </div>
        <div className="space-y-2 max-w-2xl mx-auto flex flex-col items-center">
          <Skeleton className="h-9 sm:h-12 w-4/5 rounded-xl bg-navy-800/80" />
          <Skeleton className="h-4 sm:h-5 w-3/5 rounded-md bg-navy-800/60" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-white/10">
          <Skeleton className="h-4 w-28 rounded-md bg-navy-800/60" />
          <Skeleton className="h-4 w-28 rounded-md bg-navy-800/60" />
          <Skeleton className="h-5 w-20 rounded-full bg-navy-800/80" />
        </div>
      </div>

      {/* Podium Skeleton */}
      <div className="space-y-8">
        {/* Mobile: 3 stacked cards */}
        <div className="md:hidden flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-5 w-36 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
            </Card>
          ))}
        </div>

        {/* Desktop: 3-column Olympic podium */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 items-end pt-4">
          {/* 2nd Place (Left) */}
          <Card className="h-72 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center justify-between">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2 w-full flex flex-col items-center">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </Card>

          {/* 1st Place (Center - Champion) */}
          <Card className="h-88 p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-gold-300 dark:border-gold-700/60 flex flex-col items-center text-center justify-between shadow-md">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 w-full flex flex-col items-center">
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-7 w-44 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </Card>

          {/* 3rd Place (Right) */}
          <Card className="h-64 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 flex flex-col items-center text-center justify-between">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2 w-full flex flex-col items-center">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </Card>
        </div>

        {/* Honorable Mentions Skeleton Card */}
        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 space-y-4">
          <Skeleton className="h-5 w-48 rounded-md" />
          <div className="space-y-3 divide-y divide-navy-50 dark:divide-slate-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
