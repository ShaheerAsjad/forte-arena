"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl shadow-navy-950/20 border border-navy-100/50 space-y-4 animate-in zoom-in-95 duration-200 relative",
          className
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-full text-mist hover:text-navy-950 hover:bg-navy-50 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {(title || description) && (
          <div className="pr-8 space-y-1">
            {title && (
              <h2 className="text-xl font-bold font-heading text-navy-950 tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-mist">{description}</p>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
