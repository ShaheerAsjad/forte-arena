"use client";

import React, { useState, useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";

function subscribePointer(callback: () => void) {
  const media = window.matchMedia("(hover: hover) and (pointer: fine)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getPointerSnapshot() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getPointerServerSnapshot() {
  return false;
}

export function HeroSpotlight({ children }: { children?: React.ReactNode }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const isPointerDevice = useSyncExternalStore(
    subscribePointer,
    getPointerSnapshot,
    getPointerServerSnapshot
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDevice || shouldReduceMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative w-full overflow-hidden bg-gradient-to-b from-[#000826] via-[#00134d] to-[#001969] text-ivory"
    >
      {/* 1. Ambient Glows & Aurora Blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Big Gold Radial Glow Top-Right */}
        <div className="absolute -top-[15%] right-[-10%] w-[750px] h-[650px] bg-[radial-gradient(circle_at_center,rgba(245,185,1,0.55),rgba(214,162,0,0.22),transparent_70%)] blur-[90px] pointer-events-none" />

        {/* Big Blue / Indigo Radial Glow Bottom-Left */}
        <div className="absolute -bottom-[10%] left-[-10%] w-[720px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(67,97,238,0.6),rgba(0,25,105,0.35),transparent_70%)] blur-[100px] pointer-events-none" />

        {/* Slow Animated Aurora Blob 1 (Gold/Amber, Opacity 0.65) */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 45, -30, 0],
                  y: [0, -35, 25, 0],
                  scale: [1, 1.15, 0.92, 1],
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[20%] w-[680px] h-[520px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.48),rgba(214,162,0,0.2),transparent_68%)] blur-[95px] opacity-75"
        />

        {/* Slow Animated Aurora Blob 2 (Cobalt/Royal Navy, Opacity 0.7) */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, -50, 40, 0],
                  y: [0, 40, -30, 0],
                  scale: [1, 0.9, 1.12, 1],
                }
          }
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] right-[15%] w-[620px] h-[480px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5),rgba(0,25,105,0.3),transparent_65%)] blur-[90px] opacity-70"
        />

        {/* Slow Animated Aurora Blob 3 (Cyan/Electric Accent, Opacity 0.55) */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 30, -40, 0],
                  y: [0, -20, 35, 0],
                  scale: [1, 1.08, 0.95, 1],
                }
          }
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] left-[35%] w-[500px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.35),transparent_70%)] blur-[80px] opacity-60"
        />

        {/* Soft Diagonal Light Beams */}
        <div className="absolute -inset-x-20 top-0 h-[600px] bg-gradient-to-tr from-transparent via-gold-400/[0.07] to-transparent rotate-12 blur-2xl pointer-events-none" />
        <div className="absolute -inset-x-20 top-20 h-[500px] bg-gradient-to-bl from-transparent via-blue-400/[0.08] to-transparent -rotate-12 blur-2xl pointer-events-none" />
      </div>

      {/* 2. Fine Grid Pattern Overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_65%,transparent_100%)] pointer-events-none" />

      {/* 3. Subtle Film Grain / Noise Overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.35'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 4. Interactive Mouse Spotlight (Fine Pointer Only) */}
      {isPointerDevice && !shouldReduceMotion && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 ease-out"
          style={{
            opacity: isHovering ? 1 : 0,
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 185, 1, 0.32), rgba(67, 97, 238, 0.18), transparent 70%)`,
          }}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10">{children}</div>

      {/* 5. Elegant Curved Edge Transition into Ivory Sections */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mt-1 pointer-events-none">
        <svg
          className="relative block w-full h-10 sm:h-16 lg:h-20 text-ivory fill-current"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,60 L1200,120 L0,120 Z" />
        </svg>
      </div>
    </div>
  );
}
