"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Render Error:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-md w-full text-center space-y-6 p-8 sm:p-10 rounded-3xl bg-white border border-rose-200/80 shadow-xl shadow-rose-950/5 relative overflow-hidden">
        {/* Subtle Ambient Red Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Error Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200">
            System Alert
          </span>
          <h1 className="text-2xl font-extrabold font-heading text-navy-950">
            Encountered a Problem
          </h1>
          <p className="text-sm text-mist leading-relaxed">
            {error.message || "An unexpected error occurred during page rendering. Your session is safe."}
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-mist/80 bg-navy-50/60 py-1 px-2 rounded-lg inline-block">
              Digest ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 mr-2 text-gold-400" />
            <span>Try Again</span>
          </Button>

          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full flex items-center justify-center">
              <Home className="w-4 h-4 mr-2 text-mist" />
              <span>Back Home</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
