"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PieChart, Sparkles } from "lucide-react";
import type { CategoryRegistrationCount } from "@/features/admin/admin.repository";

interface AdminRegistrationsCategoryChartProps {
  data: CategoryRegistrationCount[];
}

const CATEGORY_COLORS: Record<string, { stroke: string; bg: string; fill: string }> = {
  TECHNICAL: { stroke: "#001969", bg: "bg-navy-900", fill: "#001969" },
  SPORTS: { stroke: "#F5B901", bg: "bg-gold-500", fill: "#F5B901" },
  CULTURAL: { stroke: "#8B5CF6", bg: "bg-purple-500", fill: "#8B5CF6" },
  ACADEMIC: { stroke: "#3B82F6", bg: "bg-blue-500", fill: "#3B82F6" },
  GAMING: { stroke: "#10B981", bg: "bg-emerald-500", fill: "#10B981" },
  OTHER: { stroke: "#94A3B8", bg: "bg-slate-400", fill: "#94A3B8" },
};

export function AdminRegistrationsCategoryChart({
  data,
}: AdminRegistrationsCategoryChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const total = data.reduce((acc, d) => acc + d.count, 0);

  // Calculate SVG donut segments
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = data.map((item, idx) => {
    const percent = total > 0 ? item.count / total : 0;
    const accumulatedPercent = data
      .slice(0, idx)
      .reduce((sum, prev) => sum + (total > 0 ? prev.count / total : 0), 0);
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulatedPercent * circumference);

    return {
      ...item,
      color: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-navy-50">
        <div>
          <h2 className="text-base font-bold text-navy-950 font-heading flex items-center gap-2">
            <PieChart className="w-4 h-4 text-gold-500" />
            <span>Category Distribution</span>
          </h2>
          <p className="text-xs text-mist">Breakdown by competition domain</p>
        </div>

        <span className="text-xs font-bold text-navy-900 bg-navy-50 px-2.5 py-1 rounded-full border border-navy-100">
          6 Arenas
        </span>
      </div>

      {/* Main visual: Donut + Legend */}
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* SVG Donut Ring */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 select-none overflow-visible"
            role="img"
            aria-label="Registrations by category donut chart"
          >
            {/* Background empty ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Arcs */}
            {total > 0 &&
              segments.map((seg) => {
                const isHovered = hoveredCategory === seg.category;
                return (
                  <circle
                    key={seg.category}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color.stroke}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(seg.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
          </svg>

          {/* Donut Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-black font-heading text-navy-950 leading-none">
              {total}
            </span>
            <span className="text-[10px] font-bold text-mist uppercase tracking-wider mt-0.5">
              Entries
            </span>
          </div>
        </div>

        {/* Legend & Progress Bars */}
        <div className="flex-1 w-full space-y-2.5">
          {segments.map((item) => {
            const isHovered = hoveredCategory === item.category;
            return (
              <div
                key={item.category}
                onMouseEnter={() => setHoveredCategory(item.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? "bg-navy-50/80" : "hover:bg-navy-50/40"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color.stroke }}
                    />
                    <span
                      className={`font-semibold capitalize text-xs ${
                        isHovered ? "text-navy-950 font-bold" : "text-ink/80"
                      }`}
                    >
                      {item.category.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-navy-950">{item.count}</span>
                    <span className="text-mist">({item.percentage}%)</span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color.stroke,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-mist pt-2 border-t border-navy-50">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>Balanced participation across genres</span>
        </span>
      </div>
    </Card>
  );
}
