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
      className="relative w-full overflow-hidden"
    >
      {/* Visibly Rich Navy/Gold Ambient Mesh Gradient with Fluid Motion */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Top/Center Gold Crown Orb */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 35, -25, 0],
                  y: [0, -25, 15, 0],
                  scale: [1, 1.08, 0.94, 1],
                }
          }
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-22%] left-1/2 -translate-x-1/2 w-[980px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.32),rgba(0,25,105,0.22),transparent_72%)] blur-3xl"
        />

        {/* Right Cobalt/Navy Wave */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, -40, 30, 0],
                  y: [0, 35, -20, 0],
                  scale: [1, 0.92, 1.08, 1],
                }
          }
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[8%] right-[-10%] w-[680px] h-[520px] bg-[radial-gradient(circle_at_center,rgba(0,25,105,0.28),rgba(98,136,237,0.24),transparent_68%)] blur-3xl"
        />

        {/* Left Warm Amber Gold Wave */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 30, -35, 0],
                  y: [0, 25, -25, 0],
                  scale: [1, 1.06, 0.94, 1],
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[-10%] w-[640px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(245,185,1,0.28),rgba(214,162,0,0.2),transparent_65%)] blur-3xl"
        />

        {/* Mid-Depth Royal Navy Accent */}
        <div className="absolute top-[45%] left-1/3 -translate-x-1/2 w-[600px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(0,15,64,0.16),transparent_70%)] blur-3xl" />
      </div>

      {/* Faint Grid Texture Overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.06)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,#000_75%,transparent_100%)] pointer-events-none" />

      {/* Interactive Mouse Spotlight (Fine Pointer Only) */}
      {isPointerDevice && !shouldReduceMotion && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 ease-out"
          style={{
            opacity: isHovering ? 1 : 0,
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 185, 1, 0.28), rgba(0, 25, 105, 0.12), transparent 70%)`,
          }}
        />
      )}

      {children}
    </div>
  );
}
