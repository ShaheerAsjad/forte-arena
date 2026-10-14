import React from "react";
import type { EventCategory } from "@/lib/db-types";

interface CategoryArtworkProps {
  category: EventCategory | string;
  className?: string;
  showIcon?: boolean;
}

export function CategoryArtwork({
  category,
  className = "",
  showIcon = true,
}: CategoryArtworkProps) {
  const cat = (category || "OTHER").toUpperCase() as EventCategory;

  switch (cat) {
    case "TECHNICAL":
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#000F40] via-[#0A2784] to-[#1539A3] flex items-center justify-center ${className}`}
        >
          {/* Subtle glow nodes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Code-made Geometric Vector Motif */}
          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hexagonal Circuit Matrix */}
            <path
              d="M100 80 L130 60 L160 80 L160 115 L130 135 L100 115 Z"
              stroke="#6288ED"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d="M240 185 L270 165 L300 185 L300 220 L270 240 L240 220 Z"
              stroke="#F5B901"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {/* Circuit Traces */}
            <path
              d="M30 150 H120 L160 190 H280 L310 160 H370"
              stroke="#6288ED"
              strokeWidth="2"
            />
            <path
              d="M160 80 V30 M130 135 V220 M270 165 V110"
              stroke="#93ADF4"
              strokeWidth="1.5"
            />
            {/* Pads & Nodes */}
            <circle cx="120" cy="150" r="4" fill="#F5B901" />
            <circle cx="160" cy="190" r="4" fill="#6288ED" />
            <circle cx="280" cy="190" r="4" fill="#00D2FF" />
            <circle cx="310" cy="160" r="4" fill="#F5B901" />
            {/* Binary / Matrix Lines */}
            <line x1="40" y1="230" x2="160" y2="230" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.2" />
            <line x1="240" y1="70" x2="360" y2="70" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.2" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/40 group-hover:scale-110 group-hover:border-gold-400/60 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-cyan-200/90 font-heading">
                Technical
              </span>
            </div>
          )}
        </div>
      );

    case "SPORTS":
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#1C1200] via-[#001969] to-[#0A2784] flex items-center justify-center ${className}`}
        >
          <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-gold-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Athletic Stadium Track Ellipses */}
            <ellipse cx="200" cy="150" rx="170" ry="90" stroke="#F5B901" strokeWidth="2" strokeOpacity="0.6" />
            <ellipse cx="200" cy="150" rx="140" ry="70" stroke="#FFD966" strokeWidth="1.5" strokeOpacity="0.4" />
            <ellipse cx="200" cy="150" rx="110" ry="50" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="6 6" />
            {/* Speed Chevrons */}
            <path d="M50 150 L80 130 L70 150 L80 170 Z" fill="#F5B901" fillOpacity="0.4" />
            <path d="M350 150 L320 130 L330 150 L320 170 Z" fill="#F5B901" fillOpacity="0.4" />
            <path d="M180 30 L200 45 L220 30" stroke="#FFD966" strokeWidth="2" strokeLinecap="round" />
            <path d="M180 270 L200 255 L220 270" stroke="#FFD966" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-gold-400/40 flex items-center justify-center text-gold-400 shadow-lg shadow-navy-950/40 group-hover:scale-110 group-hover:border-gold-300 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-gold-300 font-heading">
                Sports & Athletics
              </span>
            </div>
          )}
        </div>
      );

    case "CULTURAL":
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#30053E] via-[#1F0E4D] to-[#000F40] flex items-center justify-center ${className}`}
        >
          <div className="absolute top-1/4 left-1/3 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-gold-400/15 rounded-full blur-2xl pointer-events-none" />

          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Harmonic Soundwave Curves */}
            <path
              d="M0 150 Q50 60 100 150 T200 150 T300 150 T400 150"
              stroke="#D8B4FE"
              strokeWidth="2"
            />
            <path
              d="M0 150 Q50 220 100 150 T200 150 T300 150 T400 150"
              stroke="#F5B901"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />
            <path
              d="M0 150 Q100 20 200 150 T400 150"
              stroke="#A855F7"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* Radiating Stage Beams */}
            <line x1="200" y1="280" x2="80" y2="20" stroke="#E9D5FF" strokeWidth="1" strokeOpacity="0.2" />
            <line x1="200" y1="280" x2="200" y2="10" stroke="#E9D5FF" strokeWidth="1" strokeOpacity="0.25" />
            <line x1="200" y1="280" x2="320" y2="20" stroke="#E9D5FF" strokeWidth="1" strokeOpacity="0.2" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-950/40 group-hover:scale-110 group-hover:border-gold-300 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-purple-200 font-heading">
                Cultural Arts
              </span>
            </div>
          )}
        </div>
      );

    case "ACADEMIC":
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#061838] via-[#0A2784] to-[#1E293B] flex items-center justify-center ${className}`}
        >
          <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-36 h-36 bg-gold-400/15 rounded-full blur-2xl pointer-events-none" />

          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Isometric Crystallographic Geometry */}
            <polygon points="200,60 270,105 270,195 200,240 130,195 130,105" stroke="#93ADF4" strokeWidth="2" />
            <line x1="200" y1="60" x2="200" y2="240" stroke="#6288ED" strokeWidth="1.5" />
            <line x1="130" y1="105" x2="270" y2="195" stroke="#6288ED" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="270" y1="105" x2="130" y2="195" stroke="#F5B901" strokeWidth="1.5" />
            {/* Coordinate Axis Circles */}
            <circle cx="200" cy="150" r="60" stroke="#F5B901" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="200" cy="150" r="100" stroke="#FFFFFF" strokeWidth="0.75" strokeOpacity="0.15" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-lg shadow-navy-950/40 group-hover:scale-110 group-hover:border-gold-300 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-blue-200 font-heading">
                Academic
              </span>
            </div>
          )}
        </div>
      );

    case "GAMING":
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#022C22] via-[#001969] to-[#042F2E] flex items-center justify-center ${className}`}
        >
          <div className="absolute top-1/4 right-1/3 w-36 h-36 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cyber Reticle Grid */}
            <circle cx="200" cy="150" r="75" stroke="#34D399" strokeWidth="1.5" strokeDasharray="12 6" />
            <circle cx="200" cy="150" r="40" stroke="#06B6D4" strokeWidth="1" />
            <line x1="200" y1="50" x2="200" y2="250" stroke="#34D399" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="100" y1="150" x2="300" y2="150" stroke="#34D399" strokeWidth="1" strokeOpacity="0.5" />
            {/* Crosshair corners */}
            <path d="M160 110 H175 V125" stroke="#F5B901" strokeWidth="2" />
            <path d="M240 110 H225 V125" stroke="#F5B901" strokeWidth="2" />
            <path d="M160 190 H175 V175" stroke="#F5B901" strokeWidth="2" />
            <path d="M240 190 H225 V175" stroke="#F5B901" strokeWidth="2" />
            {/* Scanlines */}
            <line x1="30" y1="240" x2="370" y2="240" stroke="#10B981" strokeWidth="1" strokeOpacity="0.2" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-950/40 group-hover:scale-110 group-hover:border-gold-300 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-emerald-200 font-heading">
                Gaming & Esports
              </span>
            </div>
          )}
        </div>
      );

    case "OTHER":
    default:
      return (
        <div
          className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-[#1C1917] via-[#0A2784] to-[#000F40] flex items-center justify-center ${className}`}
        >
          <div className="absolute top-1/3 left-1/3 w-36 h-36 bg-gold-400/20 rounded-full blur-2xl pointer-events-none" />

          <svg
            className="w-full h-full absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Multi-Point Diamond & Starburst */}
            <path
              d="M200 40 L230 120 L310 150 L230 180 L200 260 L170 180 L90 150 L170 120 Z"
              stroke="#F5B901"
              strokeWidth="2"
            />
            <circle cx="200" cy="150" r="45" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 4" />
            <circle cx="200" cy="150" r="95" stroke="#93ADF4" strokeWidth="1" strokeOpacity="0.25" />
          </svg>

          {showIcon && (
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-gold-400/40 flex items-center justify-center text-gold-300 shadow-lg shadow-navy-950/40 group-hover:scale-110 group-hover:border-gold-200 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="mt-2 text-xs font-bold tracking-widest uppercase text-gold-200 font-heading">
                Special Events
              </span>
            </div>
          )}
        </div>
      );
  }
}
