"use client";

import React, { useState, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

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
      className="relative w-full overflow-hidden"
    >
      {/* Animated Navy/Gold Ambient Mesh Gradient */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.12),rgba(0,25,105,0.06),transparent_70%)] blur-3xl animate-pulse duration-1000" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(98,136,237,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(214,162,0,0.1),transparent_65%)] blur-3xl" />
      </div>

      {/* Faint Grid Texture Overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Interactive Mouse Spotlight (Fine Pointer Only) */}
      {isPointerDevice && !shouldReduceMotion && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 ease-out"
          style={{
            opacity: isHovering ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 185, 1, 0.12), rgba(0, 25, 105, 0.05), transparent 70%)`,
          }}
        />
      )}

      {children}
    </div>
  );
}
