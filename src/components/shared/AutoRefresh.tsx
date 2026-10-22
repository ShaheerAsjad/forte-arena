"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Invisible client helper that automatically triggers router.refresh()
 * on window focus, visibility change (tab foregrounded), and on a background interval.
 * Automatically pauses when document.hidden, clears on unmount, and avoids overlapping calls.
 */
export function AutoRefresh({ intervalMs = 15000, enabled = true }: AutoRefreshProps) {
  const router = useRouter();
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const performRefresh = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isRefreshingRef.current || !isMounted) return;

      isRefreshingRef.current = true;
      router.refresh();

      // Clear the debounce guard after a short window to avoid overlapping calls
      setTimeout(() => {
        if (isMounted) {
          isRefreshingRef.current = false;
        }
      }, 2500);
    };

    const intervalId = setInterval(performRefresh, intervalMs);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        performRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [router, intervalMs, enabled]);

  return null;
}
