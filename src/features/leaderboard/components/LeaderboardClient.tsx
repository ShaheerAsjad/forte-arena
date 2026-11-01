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
  getMemberPreview,
  type LeaderboardView,
} from "../leaderboard.config";
import {
  getPodiumEntries,
  getPodiumAccent,
} from "../leaderboard.podium";
import type {
  RankedStudentItem,
  TeamLeaderboardEntry,
  RankedDepartmentItem,
} from "../leaderboard.service";
import { LeaderboardBreakdownList } from "./LeaderboardBreakdownList";
import {
  Trophy,
  Medal,
  Award,
  Users,
  Shield,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeaderboardItem =
  | RankedStudentItem
  | TeamLeaderboardEntry
  | RankedDepartmentItem;

interface LeaderboardClientProps {
  initialView: LeaderboardView;
  students: RankedStudentItem[];
  teams: TeamLeaderboardEntry[];
  departments: RankedDepartmentItem[];
  totalPublishedEvents: number;
}

function getItemKey(item: LeaderboardItem): string {
  if ("key" in item) return item.key;
  if ("teamName" in item) return `team:${item.teamName}`;
  return `dept:${item.name}`;
}

function getItemName(item: LeaderboardItem): string {
  return "teamName" in item ? item.teamName : item.name;
}

function getItemRollNumber(item: LeaderboardItem): string | null {
  return "rollNumber" in item ? item.rollNumber : null;
}

function getItemDepartment(item: LeaderboardItem): string | null {
  return "department" in item ? item.department : null;
}

export function LeaderboardClient({
  initialView,
  students,
  teams,
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
    } else if (view === "teams") {
      url.searchParams.set("view", "teams");
    } else {
      url.searchParams.delete("view");
    }
    window.history.replaceState({}, "", url.toString());
  };

  const tabs: LeaderboardView[] = ["students", "teams", "departments"];

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentView: LeaderboardView
  ) => {
    const currentIndex = tabs.indexOf(currentView);
    let targetIndex = -1;

    if (e.key === "ArrowRight") {
      targetIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const nextView = tabs[targetIndex];
      handleTabChange(nextView);
      const targetElement = document.getElementById(`tab-${nextView}`);
      targetElement?.focus();
    }
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
  const activeItems: LeaderboardItem[] =
    activeView === "students"
      ? students
      : activeView === "teams"
      ? teams
      : departments;
  const podiumEntries = getPodiumEntries(activeItems);

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Controls & Scoring Legend Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-navy-100 dark:border-slate-800 shadow-sm backdrop-blur-sm">
        {/* View Switcher Tabs - Equal-width Segmented Control */}
        <div
          role="tablist"
          aria-label="Leaderboard standings views"
          className="grid grid-cols-3 w-full md:w-auto md:min-w-[420px] p-1 rounded-2xl bg-navy-50/80 dark:bg-slate-800/80 border border-navy-100 dark:border-slate-700"
        >
          <button
            id="tab-students"
            type="button"
            role="tab"
            aria-selected={activeView === "students"}
            aria-controls="panel-standings"
            tabIndex={activeView === "students" ? 0 : -1}
            onClick={() => handleTabChange("students")}
            onKeyDown={(e) => handleTabKeyDown(e, "students")}
            className={cn(
              "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all motion-reduce:transition-none cursor-pointer min-h-[44px] min-w-0 select-none",
              activeView === "students"
                ? "bg-navy-900 text-ivory dark:bg-gold-500 dark:text-navy-950 shadow-md shadow-navy-950/20"
                : "text-navy-900/70 hover:text-navy-950 dark:text-slate-300 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
            )}
          >
            <Users className="w-4 h-4 text-gold-400 shrink-0 hidden xs:block" />
            <span className="truncate">Students</span>
            <span
              className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0",
                activeView === "students"
                  ? "bg-white/20 text-ivory dark:bg-navy-950/20 dark:text-navy-950"
                  : "bg-navy-200/50 text-navy-800 dark:bg-slate-700 dark:text-slate-200"
              )}
            >
              {students.length}
            </span>
          </button>

          <button
            id="tab-teams"
            type="button"
            role="tab"
            aria-selected={activeView === "teams"}
            aria-controls="panel-standings"
            tabIndex={activeView === "teams" ? 0 : -1}
            onClick={() => handleTabChange("teams")}
            onKeyDown={(e) => handleTabKeyDown(e, "teams")}
            className={cn(
              "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all motion-reduce:transition-none cursor-pointer min-h-[44px] min-w-0 select-none",
              activeView === "teams"
                ? "bg-navy-900 text-ivory dark:bg-gold-500 dark:text-navy-950 shadow-md shadow-navy-950/20"
                : "text-navy-900/70 hover:text-navy-950 dark:text-slate-300 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
            )}
          >
            <Shield className="w-4 h-4 text-gold-400 shrink-0 hidden xs:block" />
            <span className="truncate">Teams</span>
            <span
              className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0",
                activeView === "teams"
                  ? "bg-white/20 text-ivory dark:bg-navy-950/20 dark:text-navy-950"
                  : "bg-navy-200/50 text-navy-800 dark:bg-slate-700 dark:text-slate-200"
              )}
            >
              {teams.length}
            </span>
          </button>

          <button
            id="tab-departments"
            type="button"
            role="tab"
            aria-selected={activeView === "departments"}
            aria-controls="panel-standings"
            tabIndex={activeView === "departments" ? 0 : -1}
            onClick={() => handleTabChange("departments")}
            onKeyDown={(e) => handleTabKeyDown(e, "departments")}
            className={cn(
              "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all motion-reduce:transition-none cursor-pointer min-h-[44px] min-w-0 select-none",
              activeView === "departments"
                ? "bg-navy-900 text-ivory dark:bg-gold-500 dark:text-navy-950 shadow-md shadow-navy-950/20"
                : "text-navy-900/70 hover:text-navy-950 dark:text-slate-300 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
            )}
          >
            <GraduationCap className="w-4 h-4 text-gold-400 shrink-0 hidden xs:block" />
            <span className="hidden sm:inline truncate">Departments</span>
            <span className="sm:hidden truncate">Depts</span>
            <span
              className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0",
                activeView === "departments"
                  ? "bg-white/20 text-ivory dark:bg-navy-950/20 dark:text-navy-950"
                  : "bg-navy-200/50 text-navy-800 dark:bg-slate-700 dark:text-slate-200"
              )}
            >
              {departments.length}
            </span>
          </button>
        </div>

        {/* Scoring Legend Pill & Event Count */}
        <div className="flex flex-col items-start md:items-end gap-1 w-full md:w-auto min-w-0">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-navy-950 dark:text-amber-200 text-xs font-semibold w-full sm:w-auto min-w-0 flex-wrap xs:flex-nowrap">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-mist dark:text-slate-400 font-medium shrink-0">Scoring:</span>
            <span className="font-bold text-navy-900 dark:text-amber-100 break-words">{scoringLegend}</span>
          </div>
          <span className="text-[11px] text-mist dark:text-slate-400 font-medium px-1 sm:px-2">
            Based on {totalPublishedEvents} published competition
            {totalPublishedEvents === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {activeItems.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-10 h-10 text-mist" />}
          title={
            activeView === "teams"
              ? "No Team Standings Yet"
              : activeView === "departments"
              ? "No Department Standings Yet"
              : "No Student Standings Yet"
          }
          description={
            activeView === "teams"
              ? "Official team results and podium placements will appear here once team competitions finish and judges publish rankings."
              : activeView === "departments"
              ? "Official department points will appear here once competitions finish and results are verified."
              : "Official results and podium placements will appear here once competitions finish and judges publish rankings."
          }
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
          {/* Top Podium Leaders */}
          {podiumEntries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg sm:text-xl font-black text-navy-950 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold-500" />
                  <span>Podium Leaders</span>
                </h2>
                <span className="text-xs text-mist dark:text-slate-400 font-semibold">
                  {activeView === "students"
                    ? "Top Competitors"
                    : activeView === "teams"
                    ? "Top Teams"
                    : "Top Departments"}
                </span>
              </div>

              {/* Mobile Podium (< md): Vertical list of cards in rank order 1-2-3 */}
              <div className="md:hidden flex flex-col gap-3">
                {podiumEntries.map((entry) => (
                  <MobilePodiumCard
                    key={`mobile-podium-${getItemKey(entry)}`}
                    entry={entry}
                    isExpanded={expandedKeys.has(getItemKey(entry))}
                    onToggleExpand={() => toggleExpand(getItemKey(entry))}
                  />
                ))}
              </div>

              {/* Desktop Podium (>= md): Olympic Pedestal layout */}
              <div className="hidden md:block">
                {podiumEntries.length === 3 && (
                  <div className="grid grid-cols-3 gap-5 max-w-4xl mx-auto items-end pt-4">
                    {/* Left: 2nd place (Silver) */}
                    <div className="flex flex-col items-center">
                      <PodiumCard
                        entry={podiumEntries[1]}
                        isExpanded={expandedKeys.has(getItemKey(podiumEntries[1]))}
                        onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[1]))}
                      />
                      <Pedestal rank={podiumEntries[1].rank} />
                    </div>

                    {/* Middle: 1st place (Gold, elevated) */}
                    <div className="flex flex-col items-center -translate-y-2">
                      <PodiumCard
                        entry={podiumEntries[0]}
                        isExpanded={expandedKeys.has(getItemKey(podiumEntries[0]))}
                        onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[0]))}
                      />
                      <Pedestal rank={podiumEntries[0].rank} isMiddle />
                    </div>

                    {/* Right: 3rd place (Bronze) */}
                    <div className="flex flex-col items-center">
                      <PodiumCard
                        entry={podiumEntries[2]}
                        isExpanded={expandedKeys.has(getItemKey(podiumEntries[2]))}
                        onToggleExpand={() => toggleExpand(getItemKey(podiumEntries[2]))}
                      />
                      <Pedestal rank={podiumEntries[2].rank} />
                    </div>
                  </div>
                )}

                {podiumEntries.length === 2 && (
                  <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto items-end pt-4">
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
            </div>
          )}

          {/* Full Ranked Table / Card List */}
          <div
            id="panel-standings"
            role="tabpanel"
            aria-labelledby={`tab-${activeView}`}
            className="space-y-4 pt-4"
          >
            <div className="flex items-center justify-between border-b border-navy-100 dark:border-slate-800 pb-3">
              <h3 className="font-heading text-base sm:text-lg font-bold text-navy-950 dark:text-white">
                Complete{" "}
                {activeView === "students"
                  ? "Student"
                  : activeView === "teams"
                  ? "Team"
                  : "Department"}{" "}
                Standings
              </h3>
              <span className="text-xs text-mist dark:text-slate-400 font-medium hidden sm:inline">
                Tap row to inspect event breakdown
              </span>
            </div>

            {/* Mobile Stacked Cards (< md) */}
            <div className="md:hidden divide-y divide-navy-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-3xl border border-navy-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {activeItems.map((item) => {
                const itemKey = getItemKey(item);
                const isExpanded = expandedKeys.has(itemKey);
                const rollNumber = getItemRollNumber(item);
                const department = getItemDepartment(item);
                const itemName = getItemName(item);

                return (
                  <div key={`mobile-row-${itemKey}`} className="group transition-colors motion-reduce:transition-none">
                    <button
                      type="button"
                      onClick={() => toggleExpand(itemKey)}
                      aria-expanded={isExpanded}
                      className={cn(
                        "w-full p-3.5 flex flex-col gap-2.5 text-left transition-colors motion-reduce:transition-none min-h-[44px] cursor-pointer",
                        isExpanded
                          ? "bg-navy-50/70 dark:bg-slate-800/70"
                          : "hover:bg-navy-50/40 dark:hover:bg-slate-800/40"
                      )}
                    >
                      {/* Top Row: Rank Badge, Title, Points */}
                      <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <RankBadge rank={item.rank} />
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-heading font-bold text-sm text-navy-950 dark:text-white truncate block max-w-full"
                              title={itemName}
                            >
                              {itemName}
                            </span>
                            {rollNumber && (
                              <span className="text-[10px] font-semibold text-mist dark:text-slate-400 px-1.5 py-0.5 rounded bg-navy-50 dark:bg-slate-800 border border-navy-100 dark:border-slate-700">
                                {rollNumber}
                              </span>
                            )}
                            {department && (
                              <p
                                className="text-[11px] text-mist dark:text-slate-400 truncate mt-0.5"
                                title={department}
                              >
                                {department}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-xl bg-gold-400/20 text-navy-950 dark:text-gold-300 font-black text-xs sm:text-sm border border-gold-400/40 shrink-0 whitespace-nowrap">
                          {item.totalPoints} {item.totalPoints === 1 ? "pt" : "pts"}
                        </div>
                      </div>

                      {/* Middle Row: Teams Member Preview Chips (max 3 + "+N more") */}
                      {"members" in item && item.members.length > 0 && (
                        (() => {
                          const { visible, hiddenCount } = getMemberPreview(item.members, 3);
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap pl-11 min-w-0">
                              <span className="text-[11px] font-medium text-mist dark:text-slate-400 shrink-0">
                                Members:
                              </span>
                              {visible.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-navy-50 dark:bg-slate-800 text-navy-800 dark:text-slate-300 border border-navy-100 dark:border-slate-700 truncate max-w-[90px]"
                                  title={m.name}
                                >
                                  {m.name}
                                </span>
                              ))}
                              {hiddenCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold-100 dark:bg-gold-950/60 text-navy-900 dark:text-gold-400 border border-gold-200 dark:border-gold-800 shrink-0">
                                  +{hiddenCount} more
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}

                      {/* Bottom Row: Medal Counts & Details Expand Toggle */}
                      <div className="flex items-center justify-between gap-2 pl-11 pt-1 border-t border-navy-50 dark:border-slate-800/80 w-full text-xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold shrink-0">
                          {item.firstCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title={`${item.firstCount} 1st Place finishes`}
                            >
                              <Trophy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>{item.firstCount}</span>
                            </span>
                          )}
                          {item.secondCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                              title={`${item.secondCount} 2nd Place finishes`}
                            >
                              <Medal className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                              <span>{item.secondCount}</span>
                            </span>
                          )}
                          {item.thirdCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/70"
                              title={`${item.thirdCount} 3rd Place finishes`}
                            >
                              <Award className="w-2.5 h-2.5 text-amber-700 dark:text-amber-500" />
                              <span>{item.thirdCount}</span>
                            </span>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-800 dark:text-slate-300">
                          <span>{isExpanded ? "Hide details" : "Details"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Mobile Expanded Breakdown */}
                    {isExpanded && (
                      <div className="px-3.5 pb-4 pt-2 bg-navy-50/50 dark:bg-slate-800/50 border-t border-navy-100/70 dark:border-slate-800 space-y-3">
                        {"members" in item && item.members.length > 0 && (
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 shadow-2xs">
                            <p className="text-[11px] font-bold text-navy-900 dark:text-slate-300 uppercase tracking-wider mb-2">
                              Team Roster ({item.members.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.members.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-navy-50 dark:bg-slate-800 text-navy-950 dark:text-slate-200 text-xs font-semibold border border-navy-100 dark:border-slate-700"
                                  title={m.name}
                                >
                                  <span>{m.name}</span>
                                  {m.rollNumber && (
                                    <span className="text-[10px] text-mist dark:text-slate-400 font-normal">
                                      ({m.rollNumber})
                                    </span>
                                  )}
                                  {m.department && (
                                    <span className="text-[10px] text-navy-700 dark:text-gold-400 font-medium">
                                      • {m.department}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <LeaderboardBreakdownList breakdown={item.breakdown} columns={1} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table / Row List (>= md) */}
            <div className="hidden md:block divide-y divide-navy-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-3xl border border-navy-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {activeItems.map((item) => {
                const itemKey = getItemKey(item);
                const isExpanded = expandedKeys.has(itemKey);
                const rollNumber = getItemRollNumber(item);
                const department = getItemDepartment(item);
                const itemName = getItemName(item);

                return (
                  <div key={`desktop-row-${itemKey}`} className="group transition-colors motion-reduce:transition-none">
                    <button
                      type="button"
                      onClick={() => toggleExpand(itemKey)}
                      aria-expanded={isExpanded}
                      className={cn(
                        "w-full p-5 flex items-center justify-between gap-4 text-left transition-colors motion-reduce:transition-none min-h-[48px] cursor-pointer",
                        isExpanded
                          ? "bg-navy-50/70 dark:bg-slate-800/70"
                          : "hover:bg-navy-50/40 dark:hover:bg-slate-800/40"
                      )}
                    >
                      {/* Left: Rank & Info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <RankBadge rank={item.rank} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="font-heading font-bold text-base text-navy-950 dark:text-white group-hover:text-navy-700 dark:group-hover:text-gold-400 transition-colors truncate"
                              title={itemName}
                            >
                              {itemName}
                            </span>
                            {rollNumber && (
                              <span className="text-[11px] font-semibold text-mist dark:text-slate-400 px-2 py-0.5 rounded-md bg-navy-50 dark:bg-slate-800 border border-navy-100 dark:border-slate-700">
                                {rollNumber}
                              </span>
                            )}
                          </div>

                          {"members" in item && item.members.length > 0 && (
                            <p className="text-xs text-mist dark:text-slate-400 truncate pt-0.5 max-w-lg">
                              <span className="font-medium text-navy-900 dark:text-slate-300">Members: </span>
                              {item.members.map((m) => m.name).join(", ")}
                            </p>
                          )}

                          {department && (
                            <p
                              className="text-xs text-mist dark:text-slate-400 truncate pt-0.5"
                              title={department}
                            >
                              {department}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Medals, Points & Expand Chevron */}
                      <div className="flex items-center gap-5 shrink-0">
                        {/* Medal counts */}
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          {item.firstCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title={`${item.firstCount} 1st Place finishes`}
                            >
                              <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{item.firstCount}</span>
                            </span>
                          )}
                          {item.secondCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                              title={`${item.secondCount} 2nd Place finishes`}
                            >
                              <Medal className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>{item.secondCount}</span>
                            </span>
                          )}
                          {item.thirdCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/70"
                              title={`${item.thirdCount} 3rd Place finishes`}
                            >
                              <Award className="w-3 h-3 text-amber-700 dark:text-amber-500" />
                              <span>{item.thirdCount}</span>
                            </span>
                          )}
                        </div>

                        {/* Total Points */}
                        <div className="px-3.5 py-1.5 rounded-xl bg-gold-400/20 text-navy-950 dark:text-gold-300 font-black text-base border border-gold-400/40 shrink-0">
                          {item.totalPoints} {item.totalPoints === 1 ? "pt" : "pts"}
                        </div>

                        {/* Toggle Chevron */}
                        <div className="w-8 h-8 rounded-full bg-navy-50 dark:bg-slate-800 border border-navy-200/60 dark:border-slate-700 flex items-center justify-center text-navy-800 dark:text-slate-200 group-hover:bg-gold-500 dark:group-hover:bg-gold-500 group-hover:text-navy-950 group-hover:border-gold-400 transition-colors shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Desktop Expanded Breakdown */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-navy-50/50 dark:bg-slate-800/50 border-t border-navy-100/70 dark:border-slate-800 space-y-3">
                        {"members" in item && item.members.length > 0 && (
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-navy-100 dark:border-slate-800 shadow-2xs">
                            <p className="text-xs font-bold text-navy-900 dark:text-slate-300 uppercase tracking-wider mb-2">
                              Team Roster ({item.members.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.members.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-navy-50 dark:bg-slate-800 text-navy-950 dark:text-slate-200 text-xs font-semibold border border-navy-100 dark:border-slate-700"
                                  title={m.name}
                                >
                                  <span>{m.name}</span>
                                  {m.rollNumber && (
                                    <span className="text-[10px] text-mist dark:text-slate-400 font-normal">
                                      ({m.rollNumber})
                                    </span>
                                  )}
                                  {m.department && (
                                    <span className="text-[10px] text-navy-700 dark:text-gold-400 font-medium">
                                      • {m.department}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <LeaderboardBreakdownList breakdown={item.breakdown} columns={2} />
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
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-800 dark:text-slate-200 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
        #2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-700 text-amber-950 dark:text-amber-200 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
        #3
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-2xl bg-navy-100 dark:bg-slate-800 text-navy-900 dark:text-slate-200 font-bold text-sm flex items-center justify-center shrink-0">
      #{rank}
    </div>
  );
}

interface PodiumCardProps {
  entry: LeaderboardItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Mobile Podium Card: clean stacked vertical card in rank order 1-2-3 (< md)
 */
function MobilePodiumCard({
  entry,
  isExpanded,
  onToggleExpand,
}: PodiumCardProps) {
  const accent = getPodiumAccent(entry.rank);
  const rollNumber = getItemRollNumber(entry);
  const department = getItemDepartment(entry);
  const itemName = getItemName(entry);

  const badgeText =
    entry.rank === 1
      ? "Champion"
      : entry.rank === 2
      ? "Runner-Up"
      : `${getOrdinalSuffix(entry.rank)} Place`;

  const styles = {
    gold: {
      card: "bg-gradient-to-r from-amber-50 to-gold-50/90 dark:from-amber-950/30 dark:to-gold-950/30 border-gold-300 dark:border-gold-700/60 shadow-md ring-1 ring-gold-400/40",
      avatarBg: "bg-gold-400 dark:bg-gold-500 border-gold-200 dark:border-gold-400 text-navy-950",
      badge: "gold" as const,
      icon: <Trophy className="w-5 h-5 text-navy-950" />,
    },
    silver: {
      card: "bg-gradient-to-r from-slate-50 to-slate-100/90 dark:from-slate-900/80 dark:to-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm",
      avatarBg: "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200",
      badge: "navy" as const,
      icon: <Medal className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
    },
    bronze: {
      card: "bg-gradient-to-r from-amber-50/60 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/60 shadow-sm",
      avatarBg: "bg-amber-200 dark:bg-amber-800/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200",
      badge: "warning" as const,
      icon: <Award className="w-5 h-5 text-amber-800 dark:text-amber-300" />,
    },
  }[accent];

  return (
    <Card className={cn("w-full p-3.5 sm:p-4 flex flex-col gap-2.5", styles.card)}>
      {/* Top Header: Medal icon, Rank badge & Title, Points */}
      <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 shadow-sm",
              styles.avatarBg
            )}
          >
            {styles.icon}
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant={styles.badge} size="sm" className="mb-0.5">
              #{entry.rank} • {badgeText}
            </Badge>
            <h4
              className="font-heading text-sm sm:text-base font-bold text-navy-950 dark:text-white truncate max-w-full"
              title={itemName}
            >
              {itemName}
            </h4>
            {rollNumber && (
              <p className="text-[11px] font-semibold text-mist dark:text-slate-400">
                {rollNumber}
              </p>
            )}
            {department && (
              <p
                className="text-[11px] text-mist dark:text-slate-400 truncate"
                title={department}
              >
                {department}
              </p>
            )}
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-white/95 dark:bg-slate-800 border border-navy-100 dark:border-slate-700 shadow-2xs shrink-0 whitespace-nowrap">
          <span className="font-black text-sm sm:text-base text-navy-950 dark:text-white">
            {entry.totalPoints}
          </span>{" "}
          <span className="text-[10px] font-bold text-mist dark:text-slate-400">
            {entry.totalPoints === 1 ? "pt" : "pts"}
          </span>
        </div>
      </div>

      {/* Team member preview chips on mobile */}
      {"members" in entry && entry.members.length > 0 && (
        (() => {
          const { visible, hiddenCount } = getMemberPreview(entry.members, 3);
          return (
            <div className="flex items-center gap-1.5 flex-wrap pl-12.5 min-w-0">
              <span className="text-[11px] font-medium text-mist dark:text-slate-400 shrink-0">
                Members:
              </span>
              {visible.map((m, mIdx) => (
                <span
                  key={mIdx}
                  className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-navy-800 dark:text-slate-300 border border-navy-100 dark:border-slate-700 truncate max-w-[90px]"
                  title={m.name}
                >
                  {m.name}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold-100 dark:bg-gold-950/60 text-navy-900 dark:text-gold-400 border border-gold-200 dark:border-gold-800 shrink-0">
                  +{hiddenCount} more
                </span>
              )}
            </div>
          );
        })()
      )}

      {/* Footer: Medal count pills & details toggle */}
      <div className="flex items-center justify-between gap-2 pl-12.5 pt-1 border-t border-navy-100/60 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1 text-[11px] font-bold">
          {entry.firstCount > 0 && (
            <span
              className="flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md"
              title={`${entry.firstCount} 1st Place finishes`}
            >
              <Trophy className="w-2.5 h-2.5" /> {entry.firstCount}
            </span>
          )}
          {entry.secondCount > 0 && (
            <span
              className="flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded-md"
              title={`${entry.secondCount} 2nd Place finishes`}
            >
              <Medal className="w-2.5 h-2.5" /> {entry.secondCount}
            </span>
          )}
          {entry.thirdCount > 0 && (
            <span
              className="flex items-center gap-1 text-amber-900 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md"
              title={`${entry.thirdCount} 3rd Place finishes`}
            >
              <Award className="w-2.5 h-2.5" /> {entry.thirdCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="text-[11px] font-bold text-navy-900 dark:text-slate-200 hover:text-navy-700 dark:hover:text-gold-400 inline-flex items-center gap-1 cursor-pointer min-h-[44px]"
        >
          <span>
            {isExpanded
              ? "Hide events"
              : `View events (${entry.breakdown.length})`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="w-full text-left pt-2 border-t border-navy-100/70 dark:border-slate-800 space-y-2">
          {"members" in entry && entry.members.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-navy-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-navy-900 dark:text-slate-300 text-[11px] uppercase tracking-wider mb-1">
                Full Team Roster ({entry.members.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.members.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-navy-50 dark:bg-slate-800 text-navy-950 dark:text-slate-200 text-[11px] font-medium"
                    title={m.name}
                  >
                    {m.name}
                    {m.department ? ` (${m.department})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          <LeaderboardBreakdownList
            breakdown={entry.breakdown}
            columns={1}
          />
        </div>
      )}
    </Card>
  );
}

/**
 * Desktop Podium Card: full-height elevated card with pedestal (>= md)
 */
function PodiumCard({ entry, isExpanded, onToggleExpand }: PodiumCardProps) {
  const accent = getPodiumAccent(entry.rank);
  const rollNumber = getItemRollNumber(entry);
  const department = getItemDepartment(entry);
  const itemName = getItemName(entry);

  const badgeText =
    entry.rank === 1
      ? "Champion"
      : entry.rank === 2
      ? "Runner-Up"
      : `${getOrdinalSuffix(entry.rank)} Place`;

  const styles = {
    gold: {
      card: "bg-gradient-to-b from-amber-50 to-gold-50/90 dark:from-amber-950/40 dark:to-gold-950/30 border-gold-300 dark:border-gold-700 shadow-xl ring-2 ring-gold-400/50 p-6 sm:p-7",
      avatarBg: "bg-gold-400 dark:bg-gold-500 border-gold-200 dark:border-gold-300 text-navy-950",
      badge: "gold" as const,
      icon: <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-navy-950" />,
    },
    silver: {
      card: "bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-900/80 dark:to-slate-800/80 border-slate-200 dark:border-slate-700 shadow-md p-5 sm:p-6",
      avatarBg: "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200",
      badge: "navy" as const,
      icon: <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-slate-600 dark:text-slate-300" />,
    },
    bronze: {
      card: "bg-gradient-to-b from-amber-50/60 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800 shadow-md p-5 sm:p-6",
      avatarBg: "bg-amber-200 dark:bg-amber-800/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200",
      badge: "warning" as const,
      icon: <Award className="w-6 h-6 sm:w-7 sm:h-7 text-amber-800 dark:text-amber-300" />,
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

      <div className="space-y-1 w-full min-w-0">
        <Badge variant={styles.badge} size="sm">
          #{entry.rank} • {badgeText}
        </Badge>
        <h4
          className="font-heading text-lg sm:text-xl font-bold text-navy-950 dark:text-white pt-1 truncate max-w-full"
          title={itemName}
        >
          {itemName}
        </h4>
        {"members" in entry && entry.members.length > 0 && (
          <p className="text-xs text-mist dark:text-slate-400 truncate max-w-full px-2" title={entry.members.map((m) => m.name).join(", ")}>
            {entry.members.map((m) => m.name).join(", ")}
          </p>
        )}
        {rollNumber && (
          <p className="text-xs font-semibold text-mist dark:text-slate-400">{rollNumber}</p>
        )}
        {department && (
          <p className="text-xs text-mist dark:text-slate-400 truncate" title={department}>{department}</p>
        )}
      </div>

      {/* Points */}
      <div className="px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-800 border border-navy-100 dark:border-slate-700 shadow-2xs">
        <span className="font-black text-lg sm:text-xl text-navy-950 dark:text-white">
          {entry.totalPoints}
        </span>{" "}
        <span className="text-xs font-bold text-mist dark:text-slate-400">
          {entry.totalPoints === 1 ? "pt" : "pts"}
        </span>
      </div>

      {/* Medal Counts */}
      <div className="flex items-center gap-2 text-xs font-bold pt-1">
        {entry.firstCount > 0 && (
          <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
            <Trophy className="w-3 h-3" /> {entry.firstCount}
          </span>
        )}
        {entry.secondCount > 0 && (
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            <Medal className="w-3 h-3" /> {entry.secondCount}
          </span>
        )}
        {entry.thirdCount > 0 && (
          <span className="flex items-center gap-1 text-amber-900 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
            <Award className="w-3 h-3" /> {entry.thirdCount}
          </span>
        )}
      </div>

      {/* Breakdown trigger */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="text-xs font-bold text-navy-900 dark:text-slate-200 hover:text-navy-700 dark:hover:text-gold-400 underline underline-offset-2 pt-1 inline-flex items-center gap-1 cursor-pointer min-h-[44px]"
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
        <div className="w-full text-left pt-3 border-t border-navy-100/70 dark:border-slate-800 space-y-2">
          {"members" in entry && entry.members.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900 border border-navy-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-navy-900 dark:text-slate-300 text-[11px] uppercase tracking-wider mb-1">
                Full Team Roster ({entry.members.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.members.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-navy-50 dark:bg-slate-800 text-navy-950 dark:text-slate-200 text-[11px] font-medium"
                    title={m.name}
                  >
                    {m.name}
                    {m.department ? ` (${m.department})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          <LeaderboardBreakdownList
            breakdown={entry.breakdown}
            columns={1}
          />
        </div>
      )}
    </Card>
  );
}

function Pedestal({ rank, isMiddle = false }: { rank: number; isMiddle?: boolean }) {
  const isRank1 = rank === 1;
  const isRank2 = rank === 2;

  const heightClass = isRank1 || isMiddle ? "h-20 md:h-24" : isRank2 ? "h-14 md:h-16" : "h-10 md:h-12";
  const bgClass = isRank1
    ? "bg-gold-400/95 dark:bg-gold-500/90 text-navy-950 text-2xl md:text-3xl"
    : isRank2
    ? "bg-slate-200/90 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 text-lg md:text-xl"
    : "bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200 text-base md:text-lg";

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
