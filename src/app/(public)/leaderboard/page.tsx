import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { LeaderboardClient } from "@/features/leaderboard/components/LeaderboardClient";
import { LeaderboardService } from "@/features/leaderboard/leaderboard.service";
import { parseLeaderboardView } from "@/features/leaderboard/leaderboard.config";

export const metadata: Metadata = {
  title: "Championship Leaderboard & Standings | Forté Arena",
  description:
    "Official standings, student rankings, and department points earned from published podium finishes across all campus competitions.",
  openGraph: {
    title: "Championship Leaderboard & Standings | Forté Arena",
    description:
      "Official campus rankings and department standings across all festival events.",
    url: "/leaderboard",
    siteName: "Forté Arena",
    type: "website",
  },
};

interface LeaderboardPageProps {
  searchParams: Promise<{
    view?: string;
  }>;
}

export default function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  return (
    <PageShell
      badge="Official Standings"
      title="Championship Leaderboard"
      description="Overall rankings and department points earned from verified podium finishes across all campus competitions."
    >
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardLoader searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function LeaderboardLoader({
  searchParams,
}: {
  searchParams: LeaderboardPageProps["searchParams"];
}) {
  const [params, data] = await Promise.all([
    searchParams,
    LeaderboardService.getLeaderboardData(),
  ]);

  const initialView = parseLeaderboardView(params?.view);

  return (
    <LeaderboardClient
      initialView={initialView}
      students={data.students}
      departments={data.departments}
      totalPublishedEvents={data.totalPublishedEvents}
    />
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-10 pb-16 animate-pulse">
      {/* Controls Bar Skeleton */}
      <div className="p-4 rounded-3xl bg-white border border-navy-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-64 rounded-2xl" />
      </div>

      {/* Podium Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-4 items-end">
        <Card className="h-56 bg-slate-50 border-slate-200 rounded-3xl" />
        <Card className="h-68 bg-amber-50/80 border-gold-300 rounded-3xl" />
        <Card className="h-48 bg-amber-50/50 border-amber-200 rounded-3xl" />
      </div>

      {/* Ranked List Skeleton */}
      <div className="space-y-3 pt-6">
        <Skeleton className="h-6 w-48 rounded-md" />
        <div className="space-y-2 bg-white rounded-3xl border border-navy-100 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border-b border-navy-50 last:border-0"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-9 h-9 rounded-2xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
