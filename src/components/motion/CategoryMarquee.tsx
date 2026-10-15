"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import {
  Code2,
  Trophy,
  Sparkles,
  GraduationCap,
  Gamepad2,
  HelpCircle,
} from "lucide-react";

const CATEGORIES = [
  { id: "TECHNICAL", label: "Technical & Hackathons", icon: Code2, color: "text-cyan-400" },
  { id: "SPORTS", label: "Athletics & Sports", icon: Trophy, color: "text-amber-400" },
  { id: "CULTURAL", label: "Cultural Arts & Music", icon: Sparkles, color: "text-purple-400" },
  { id: "ACADEMIC", label: "Academic & Quizzing", icon: GraduationCap, color: "text-blue-400" },
  { id: "GAMING", label: "Esports & Gaming", icon: Gamepad2, color: "text-emerald-400" },
  { id: "OTHER", label: "Special Arenas", icon: HelpCircle, color: "text-gold-400" },
];

export function CategoryMarquee() {
  const shouldReduceMotion = useReducedMotion();

  // Duplicate for seamless 50% loop
  const items = [...CATEGORIES, ...CATEGORIES];

  return (
    <div className="w-full overflow-hidden border-y border-white/10 bg-black/30 backdrop-blur-md py-4 select-none">
      <div className="relative max-w-6xl mx-auto px-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div
          className={`flex items-center gap-8 w-max ${
            shouldReduceMotion
              ? "flex-wrap justify-center"
              : "animate-marquee hover:[animation-play-state:paused]"
          }`}
          style={{
            animation: shouldReduceMotion ? "none" : "marquee 32s linear infinite",
          }}
        >
          {items.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link
                key={`${cat.id}-${idx}`}
                href={`/events?category=${cat.id}`}
                className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
              >
                <span className="w-7 h-7 rounded-lg bg-navy-900 border border-white/15 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                </span>
                <span className="text-xs sm:text-sm font-bold text-ivory/90 group-hover:text-gold-300 transition-colors font-heading tracking-wide">
                  {cat.label}
                </span>
                <span className="text-gold-400/50 font-bold ml-4">•</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
