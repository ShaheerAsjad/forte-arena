"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendingUp, Calendar } from "lucide-react";
import type { DailyRegistrationCount } from "@/features/admin/admin.repository";

interface AdminRegistrationsDailyChartProps {
  data: DailyRegistrationCount[];
}

export function AdminRegistrationsDailyChart({ data }: AdminRegistrationsDailyChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, d) => acc + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 4);

  // SVG dimensions & margins
  const width = 540;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padTop + chartH - (d.count / maxCount) * chartH;
    return { x, y, ...d };
  });

  // Construct SVG Area and Line path strings
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
    : "";

  return (
    <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-navy-50">
        <div>
          <h2 className="text-base font-bold text-navy-950 font-heading flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            <span>14-Day Registration Trend</span>
          </h2>
          <p className="text-xs text-mist">Daily application volume across all arenas</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-navy-50 text-navy-900 border border-navy-100">
            <Calendar className="w-3.5 h-3.5 text-gold-500" />
            <span>{total} Total</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="Registrations over past 14 days chart"
        >
          <defs>
            <linearGradient id="goldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5B901" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#F5B901" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#F5B901" stopOpacity="0.0" />
            </linearGradient>
            <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#001969" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = padTop + chartH * (1 - pct);
            const val = Math.round(maxCount * pct);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#goldAreaGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Line Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#D99B00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shadowFilter)"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer group"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? "#F5B901" : "#001969"}
                  stroke="#FFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />

                {/* Tooltip bubble on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={p.x - 36}
                      y={p.y - 34}
                      width="72"
                      height="24"
                      rx="6"
                      fill="#001969"
                      className="shadow-md"
                    />
                    <text
                      x={p.x}
                      y={p.y - 18}
                      textAnchor="middle"
                      fill="#FFF"
                      className="text-[11px] font-bold font-heading"
                    >
                      {p.count} regs
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* X-axis date labels */}
          {points
            .filter((_, idx) => idx % 3 === 0 || idx === points.length - 1)
            .map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-semibold"
              >
                {p.label}
              </text>
            ))}
        </svg>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-mist pt-2 border-t border-navy-50">
        <span>Updated continuously from registration records</span>
        {hoveredIdx !== null ? (
          <span className="font-bold text-navy-950">
            {data[hoveredIdx].label}: {data[hoveredIdx].count} registrations
          </span>
        ) : (
          <span>Hover a point for daily breakdown</span>
        )}
      </div>
    </Card>
  );
}
