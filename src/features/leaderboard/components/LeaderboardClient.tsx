"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  LEADERBOARD_POINTS,
  getScoringLegendText,
  getOrdinalSuffix,
  type LeaderboardView,
} from "../leaderboard.config";
import {
  getPodiumEntries,
  getPodiumAccent,
} from "../leaderboard.podium";
import type {
  RankedStudentItem,
  RankedDepartmentItem,
} from "../leaderboard.service";
import { LeaderboardBreakdownList } from "./LeaderboardBreakdownList";
import {
  Trophy,
  Medal,
  Award,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardClientProps {
  initialView: LeaderboardView;
  students: RankedStudentItem[];
  departments: RankedDepartmentItem[];
  totalPublishedEvents: number;
}

function getItemKey(item: RankedStudentItem | RankedDepartmentItem): string {
  return "key" in item ? item.key : item.name;
}

function getItemRollNumber(item: RankedStudentItem | RankedDepartmentItem): string | null {
  return "rollNumber" in item ? item.rollNumber : null;
}

function getItemDepartment(item: RankedStudentItem | RankedDepartmentItem): string | null {
  return "department" in item ? item.department : null;
}

export function LeaderboardClient({
  initialView,
  students,
  departments,
  totalPublishedEvents,
}: LeaderboardClientProps) {
  const [activeView, setActiveView] = useState<LeaderboardView>(initialView);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const handleTabChange = (view: LeaderboardView) => {
    setActiveView(view);
    const url = new URL(window.location.href);
    if (view === "departments") {
      url.searchParams.set("view", "departments");
    } else {
      url.searchParams.delete("view");
    }
    window.history.replaceState({}, "", url.toString());
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const scoringLegend = getScoringLegendText(LEADERBOARD_POINTS);
  const activeItems = activeView === "students" ? students : departments;
  const podiumEntries = getPodiumEntries(activeItems);

  return (
    <div className="space-y-10 pb-16">
      {/* Controls & Scoring Legend Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl bg-white/90 border border-navy-100 shadow-sm backdrop-blur-sm">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-navy-50/80 border border-navy-100 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange("students")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px]",
              activeView === "students"
                ? "bg-navy-900 text-ivory shadow-md shadow-navy-950/20"
                : "text-navy-900/70 hover:text-navy-950 hover:bg-white/60"
            )}
          >
            <Users className="w-4 h-4 text-gold-400" />
            <span>Students</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold",
                activeView === "students"
                  ? "bg-white/20 text-ivory"
                  : "bg-navy-200/50 text-navy-800"
              )}
            >
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("departments")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px]",
              activeView === "departments"
                ? "bg-navy-900 text-ivory shadow-md shadow-navy-950/20"
                : "text-navy-900/70 hover:text-navy-950 hover:bg-white/60"
            )}
          >
            <GraduationCap className="w-4 h-4 text-gold-400" />
            <span>Departments</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold",
                activeView === "departments"
                  ? "bg-white/20 text-ivory"
                  : "bg-navy-200/50 text-navy-800"
              )}
            >
              {departments.length}
            </span>
          </button>
        </div>

        {/* Scoring Legend Pill & Event Count */}
        <div className="flex flex-col items-start md:items-end gap-1">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-navy-950 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-mist font-medium">Scoring:</span>
            <span className="font-bold text-navy-900">{scoringLegend}</span>
          </div>
          <span className="text-[11px] text-mist font-medium px-2">
            Based on {totalPublishedEvents} published competition
            {totalPublishedEvents === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {activeItems.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-10 h-10 text-mist" />}
          title="No Standings Yet"
          description="Official results and podium placements will appear here once competitions finish and judges publish rankings."
          action={
            <Link href="/events">
              <Button variant="gold" size="sm" withArrow>
                Explore Competitions
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Top Podium Cards */}
          {podiumEntries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg sm:text-xl font-black text-navy-950 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold-500" />
                  <span>Podium Leaders</span>
                </h2>
                <span className="text-xs text-mist font-semibold">
                  {activeView === "students" ? "Top Competitors" : "Top Departments"}
                </span>
              </div>

              {/* 3 Entries Layout: Middle = 1st entry, Left = 2nd entry, Right = 3rd entry */}
              {podiumEntries.length === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-end pt-4">
                  {/* Left (Second entry in sorted list) */}
                  <div className="order-2 md:order-1 flex flex-col items-center">
                    <PodiumCard
                      entry={podiumEntries[1]}
                      isExpanded={expandedKeys.has(getItemKey(podiumEntries[1]))}
                      onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[1]))}
                    />
                    <Pedestal rank={podiumEntries[1].rank} />
                  </div>

                  {/* Middle (First entry in sorted list) */}
                  <div className="order-1 md:order-2 flex flex-col items-center -translate-y-2">
                    <PodiumCard
                      entry={podiumEntries[0]}
                      isExpanded={expandedKeys.has(getItemKey(podiumEntries[0]))}
                      onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[0]))}
                    />
                    <Pedestal rank={podiumEntries[0].rank} isMiddle />
                  </div>

                  {/* Right (Third entry in sorted list) */}
                  <div className="order-3 md:order-3 flex flex-col items-center">
                    <PodiumCard
                      entry={podiumEntries[2]}
                      isExpanded={expandedKeys.has(getItemKey(podiumEntries[2]))}
                      onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[2]))}
                    />
                    <Pedestal rank={podiumEntries[2].rank} />
                  </div>
                </div>
              )}

              {/* 2 Entries Layout: Centered side-by-side */}
              {podiumEntries.length === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto items-end pt-4">
                  <div className="flex flex-col items-center">
                    <PodiumCard
                      entry={podiumEntries[0]}
                      isExpanded={expandedKeys.has(getItemKey(podiumEntries[0]))}
                      onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[0]))}
                    />
                    <Pedestal rank={podiumEntries[0].rank} isMiddle />
                  </div>

                  <div className="flex flex-col items-center">
                    <PodiumCard
                      entry={podiumEntries[1]}
                      isExpanded={expandedKeys.has(getItemKey(podiumEntries[1]))}
                      onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[1]))}
                    />
                    <Pedestal rank={podiumEntries[1].rank} />
                  </div>
                </div>
              )}

              {/* 1 Entry Layout: Centered single card */}
              {podiumEntries.length === 1 && (
                <div className="max-w-md mx-auto items-end pt-4 flex flex-col items-center">
                  <PodiumCard
                    entry={podiumEntries[0]}
                    isExpanded={expandedKeys.has(getItemKey(podiumEntries[0]))}
                    onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[0]))}
                  />
                  <Pedestal rank={podiumEntries[0].rank} isMiddle />
                </div>
              )}
            </div>
          )}

          {/* Full Ranked Table / Card List */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="font-heading text-base sm:text-lg font-bold text-navy-950">
                Complete {activeView === "students" ? "Student" : "Department"} Standings
              </h3>
              <span className="text-xs text-mist font-medium">
                Tap row to inspect event breakdown
              </span>
            </div>

            <div className="divide-y divide-navy-100 bg-white rounded-3xl border border-navy-100 shadow-sm overflow-hidden">
              {activeItems.map((item) => {
                const itemKey = getItemKey(item);
                const isExpanded = expandedKeys.has(itemKey);
                const rollNumber = getItemRollNumber(item);
                const department = getItemDepartment(item);

                return (
                  <div key={itemKey} className="group transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleExpand(itemKey)}
                      aria-expanded={isExpanded}
                      className={cn(
                        "w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors min-h-[48px] cursor-pointer",
                        isExpanded ? "bg-navy-50/70" : "hover:bg-navy-50/40"
                      )}
                    >
                      {/* Left: Rank & Info */}
                      <div className="flex items-center gap-3.5 sm:gap-4">
                        <RankBadge rank={item.rank} />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-bold text-sm sm:text-base text-navy-950 group-hover:text-navy-700 transition-colors">
                              {item.name}
                            </span>
                            {rollNumber && (
                              <span className="text-[11px] font-semibold text-mist px-2 py-0.5 rounded-md bg-navy-50 border border-navy-100">
                                {rollNumber}
                              </span>
                            )}
                          </div>

                          {department && (
                            <p className="text-xs text-mist truncate pt-0.5">
                              {department}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Medals, Points & Expand Chevron */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 self-stretch sm:self-auto pl-12 sm:pl-0">
                        {/* Medal counts */}
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          {item.firstCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200"
                              title={`${item.firstCount} 1st Place finishes`}
                            >
                              <Trophy className="w-3 h-3 text-amber-600" />
                              <span>{item.firstCount}</span>
                            </span>
                          )}
                          {item.secondCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200"
                              title={`${item.secondCount} 2nd Place finishes`}
                            >
                              <Medal className="w-3 h-3 text-slate-500" />
                              <span>{item.secondCount}</span>
                            </span>
                          )}
                          {item.thirdCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70"
                              title={`${item.thirdCount} 3rd Place finishes`}
                            >
                              <Award className="w-3 h-3 text-amber-700" />
                              <span>{item.thirdCount}</span>
                            </span>
                          )}
                        </div>

                        {/* Total Points */}
                        <div className="px-3 py-1 rounded-xl bg-gold-400/20 text-navy-950 font-black text-sm sm:text-base border border-gold-400/40 shrink-0">
                          {item.totalPoints} {item.totalPoints === 1 ? "pt" : "pts"}
                        </div>

                        {/* Toggle Chevron */}
                        <div className="w-8 h-8 rounded-full bg-navy-50 border border-navy-200/60 flex items-center justify-center text-navy-800 group-hover:bg-gold-500 group-hover:border-gold-400 transition-colors shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Breakdown */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-navy-50/50 border-t border-navy-100/70">
                        <LeaderboardBreakdownList breakdown={item.breakdown} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-gold-500 text-navy-950 font-black text-sm flex items-center justify-center shadow-md shadow-gold-500/30 shrink-0">
        #1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
        #2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
        #3
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-2xl bg-navy-100 text-navy-900 font-bold text-sm flex items-center justify-center shrink-0">
      #{rank}
    </div>
  );
}

interface PodiumCardProps {
  entry: RankedStudentItem | RankedDepartmentItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function PodiumCard({ entry, isExpanded, onToggleExpand }: PodiumCardProps) {
  const accent = getPodiumAccent(entry.rank);
  const rollNumber = getItemRollNumber(entry);
  const department = getItemDepartment(entry);

  const badgeText =
    entry.rank === 1
      ? "Champion"
      : entry.rank === 2
      ? "Runner-Up"
      : `${getOrdinalSuffix(entry.rank)} Place`;

  const styles = {
    gold: {
      card: "bg-gradient-to-b from-amber-50 to-gold-50/90 border-gold-300 shadow-xl ring-2 ring-gold-400/50 p-6 sm:p-7",
      avatarBg: "bg-gold-400 border-gold-200 text-navy-950",
      badge: "gold" as const,
      icon: <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-navy-950" />,
    },
    silver: {
      card: "bg-gradient-to-b from-slate-50 to-slate-100/90 border-slate-200 shadow-md p-5 sm:p-6",
      avatarBg: "bg-slate-200 border-slate-300 text-slate-700",
      badge: "navy" as const,
      icon: <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-slate-600" />,
    },
    bronze: {
      card: "bg-gradient-to-b from-amber-50/60 to-amber-100/50 border-amber-200 shadow-md p-5 sm:p-6",
      avatarBg: "bg-amber-200 border-amber-300 text-amber-900",
      badge: "warning" as const,
      icon: <Award className="w-6 h-6 sm:w-7 sm:h-7 text-amber-800" />,
    },
  }[accent];

  return (
    <Card className={cn("w-full text-center flex flex-col items-center space-y-3", styles.card)}>
      {/* Medal Icon Badge */}
      <div
        className={cn(
          "w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center shadow-md",
          styles.avatarBg
        )}
      >
        {styles.icon}
      </div>

      <div className="space-y-1 w-full">
        <Badge variant={styles.badge} size="sm">
          #{entry.rank} • {badgeText}
        </Badge>
        <h4 className="font-heading text-lg sm:text-xl font-bold text-navy-950 pt-1 truncate max-w-full">
          {entry.name}
        </h4>
        {rollNumber && (
          <p className="text-xs font-semibold text-mist">{rollNumber}</p>
        )}
        {department && (
          <p className="text-xs text-mist truncate">{department}</p>
        )}
      </div>

      {/* Points */}
      <div className="px-4 py-1.5 rounded-full bg-white/90 border border-navy-100 shadow-2xs">
        <span className="font-black text-lg sm:text-xl text-navy-950">
          {entry.totalPoints}
        </span>{" "}
        <span className="text-xs font-bold text-mist">
          {entry.totalPoints === 1 ? "pt" : "pts"}
        </span>
      </div>

      {/* Medal Counts */}
      <div className="flex items-center gap-2 text-xs font-bold pt-1">
        {entry.firstCount > 0 && (
          <span className="flex items-center gap-1 text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
            <Trophy className="w-3 h-3" /> {entry.firstCount}
          </span>
        )}
        {entry.secondCount > 0 && (
          <span className="flex items-center gap-1 text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
            <Medal className="w-3 h-3" /> {entry.secondCount}
          </span>
        )}
        {entry.thirdCount > 0 && (
          <span className="flex items-center gap-1 text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded-md">
            <Award className="w-3 h-3" /> {entry.thirdCount}
          </span>
        )}
      </div>

      {/* Breakdown trigger */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="text-xs font-bold text-navy-900 hover:text-navy-700 underline underline-offset-2 pt-1 inline-flex items-center gap-1 cursor-pointer min-h-[40px]"
      >
        <span>
          {isExpanded
            ? "Hide events"
            : `View ${entry.breakdown.length} event${entry.breakdown.length === 1 ? "" : "s"}`}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Expanded Breakdown right inside the podium card */}
      {isExpanded && (
        <LeaderboardBreakdownList
          breakdown={entry.breakdown}
          gridClassName="grid-cols-1"
          className="w-full text-left pt-3 border-t border-navy-100/70"
        />
      )}
    </Card>
  );
}

function Pedestal({ rank, isMiddle = false }: { rank: number; isMiddle?: boolean }) {
  const isRank1 = rank === 1;
  const isRank2 = rank === 2;

  const heightClass = isRank1 || isMiddle ? "h-20 md:h-24" : isRank2 ? "h-14 md:h-16" : "h-10 md:h-12";
  const bgClass = isRank1
    ? "bg-gold-400/95 text-navy-950 text-2xl md:text-3xl"
    : isRank2
    ? "bg-slate-200/90 text-slate-600 text-lg md:text-xl"
    : "bg-amber-200/80 text-amber-900 text-base md:text-lg";

  return (
    <div
      className={cn(
        "hidden md:flex w-full rounded-b-2xl items-center justify-center font-black font-heading shadow-inner",
        heightClass,
        bgClass
      )}
    >
      {getOrdinalSuffix(rank)}
    </div>
  );
}
