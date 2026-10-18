"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  isPaused?: boolean;
}

export function QrScanner({ onScan, isPaused = false }: QrScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const rawId = useId();
  const containerId = `qr-reader-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;
    let activeScanner: Html5Qrcode | null = null;

    async function initializeCamera() {
      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        activeScanner = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.floor(minDim * 0.72);
              return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (isPausedRef.current) return;
            onScanRef.current(decodedText.trim());
          },
          () => {
            // Frame scan without detection - silent
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setIsInitializing(false);
          setCameraError(null);
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("Permission") ||
          msg.includes("NotAllowedError")
        ) {
          setCameraError(
            "Camera access was denied. Please grant camera permission in your browser or address bar settings, or use the manual search below."
          );
        } else if (
          msg.includes("NotFound") ||
          msg.includes("DevicesNotFoundError")
        ) {
          setCameraError(
            "No camera detected on this device. You can look up students and check them in manually using the search box below."
          );
        } else {
          setCameraError(
            "Could not activate camera stream. Camera requires HTTPS or localhost. You can use manual check-in below."
          );
        }
        setIsScanning(false);
        setIsInitializing(false);
      }
    }

    initializeCamera();

    return () => {
      isMounted = false;
      if (activeScanner) {
        try {
          if (activeScanner.isScanning) {
            activeScanner.stop().then(() => {
              activeScanner?.clear();
            }).catch(() => {});
          } else {
            activeScanner.clear();
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [containerId, retryKey]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
      {/* Viewfinder area */}
      <div className="relative aspect-square sm:aspect-[4/3] w-full flex items-center justify-center bg-black overflow-hidden">
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy-950/90 text-ivory gap-3 p-4">
            <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
            <p className="text-xs font-semibold">Requesting camera access...</p>
          </div>
        )}

        {/* Error overlay */}
        {cameraError && !isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy-950/95 text-ivory p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-danger-bg text-danger flex items-center justify-center border border-danger/30">
              <CameraOff className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">Camera Unavailable</p>
            <p className="text-xs text-mist max-w-xs leading-relaxed">
              {cameraError}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsInitializing(true);
                setCameraError(null);
                setRetryKey((k) => k + 1);
              }}
              className="mt-2 text-xs border-navy-700 hover:bg-navy-800 text-ivory"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        )}

        {/* Scanner target frame & guide lines (when active and not paused) */}
        {isScanning && !cameraError && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {/* Darkened edges */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-gold-400/80 shadow-[0_0_0_9999px_rgba(10,25,47,0.45)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-gold-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-gold-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-gold-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-gold-400 rounded-br-lg" />

              {/* Scanning laser animation if not paused */}
              {!isPaused ? (
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
              ) : (
                <div className="absolute inset-0 bg-navy-950/60 rounded-2xl flex items-center justify-center backdrop-blur-2xs">
                  <span className="text-xs font-bold text-gold-400 bg-navy-900/90 px-3 py-1 rounded-full border border-gold-400/30">
                    Paused
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera Status Bar */}
      <div className="p-3 bg-navy-900/90 border-t border-navy-800/80 flex items-center justify-between text-xs text-mist">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gold-400" />
          <span className="font-medium text-navy-200">
            {isPaused ? "Scanner paused (cooldown)" : isScanning ? "Align QR code in center" : "Camera idle"}
          </span>
        </div>

        {isScanning && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live
          </span>
        )}
      </div>
    </div>
  );
}
