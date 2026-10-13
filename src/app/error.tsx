"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-white border border-danger-bg shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-danger-bg text-danger mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading text-navy-950">
            Something went wrong
          </h2>
          <p className="text-sm text-mist">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <Button onClick={() => reset()} variant="primary" className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}
