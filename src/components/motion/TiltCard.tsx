"use client";

import React, { useRef, useSyncExternalStore } from "react";
import { motion, useSpring, useReducedMotion } from "motion/react";

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

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 8,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPointerDevice = useSyncExternalStore(
    subscribePointer,
    getPointerSnapshot,
    getPointerServerSnapshot
  );
  const shouldReduceMotion = useReducedMotion();

  // Springs for buttery smooth interpolation
  const rotateX = useSpring(0, { stiffness: 260, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDevice || shouldReduceMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = -((y - centerY) / centerY) * maxTilt;
    const tiltY = ((x - centerX) / centerX) * maxTilt;

    rotateX.set(tiltX);
    rotateY.set(tiltY);
  };

  const handleMouseLeave = () => {
    if (!isPointerDevice || shouldReduceMotion) return;
    rotateX.set(0);
    rotateY.set(0);
  };

  if (!isPointerDevice || shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`perspective-1000 ${className}`}
    >
      {children}
    </motion.div>
  );
}
