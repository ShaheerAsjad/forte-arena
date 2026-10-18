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
  const [technicalReason, setTechnicalReason] = useState<string | null>(null);
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
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        activeScanner = scanner;

        // html5-qrcode requires the 1st argument (cameraIdOrConfig) to have EXACTLY ONE key ({ facingMode } or { deviceId }).
        // Extended media constraints (width/height) are passed under config.videoConstraints.
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            videoConstraints: {
              facingMode: "environment",
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
            },
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Exact single decode region: fixed square up to 250px, never larger than viewfinder
              const edge = Math.min(Math.min(viewfinderWidth, viewfinderHeight) - 30, 250);
              const size = Math.max(160, Math.floor(edge));
              return { width: size, height: size };
            },
            aspectRatio: 1.333333, // 4:3 native ratio to prevent stretching
          },
          (decodedText: string) => {
            if (isPausedRef.current) return;
            onScanRef.current(decodedText);
          },
          () => {
            // Frame scan without detection - silent
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setIsInitializing(false);
          setCameraError(null);
          setTechnicalReason(null);
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
          setTechnicalReason(null);
        } else if (
          msg.includes("NotFound") ||
          msg.includes("DevicesNotFoundError")
        ) {
          setCameraError(
            "No camera detected on this device. You can look up students and check them in manually using the search box below."
          );
          setTechnicalReason(null);
        } else {
          setCameraError(
            "Could not activate camera stream. Camera requires HTTPS or localhost. You can use manual check-in below."
          );
          setTechnicalReason(msg.trim().slice(0, 80));
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
      {/* Scoped CSS to style html5-qrcode's single decode box to brand gold and remove green default artifacts */}
      <style jsx global>{`
        #${containerId} video {
          object-fit: cover !important;
          border-radius: 0.75rem !important;
          width: 100% !important;
        }
        #${containerId} #qr-shaded-region {
          border-color: rgba(245, 185, 1, 0.85) !important;
        }
        #${containerId} #qr-shaded-region > div {
          border-color: #f5b901 !important;
          border-width: 3px !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 0 15px rgba(245, 185, 1, 0.25) !important;
        }
      `}</style>

      {/* Viewfinder area: 4:3 compact ratio on mobile (max-h ~46vh) so result card stays immediately visible */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[46vh] sm:max-h-[380px] w-full flex items-center justify-center bg-black overflow-hidden">
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy-950/90 text-ivory gap-2.5 p-4">
            <RefreshCw className="w-7 h-7 text-gold-400 animate-spin" />
            <p className="text-xs font-semibold">Requesting camera access...</p>
          </div>
        )}

        {/* Error overlay */}
        {cameraError && !isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-navy-950/95 text-ivory p-5 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-danger-bg text-danger flex items-center justify-center border border-danger/30">
              <CameraOff className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-white">Camera Unavailable</p>
            <p className="text-[11px] text-mist max-w-xs leading-relaxed">
              {cameraError}
            </p>
            {technicalReason && (
              <p className="text-[10px] font-mono text-mist/90 bg-navy-900/90 px-2.5 py-1 rounded-lg border border-navy-800 max-w-xs break-all">
                Reason: {technicalReason}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsInitializing(true);
                setCameraError(null);
                setTechnicalReason(null);
                setRetryKey((k) => k + 1);
              }}
              className="mt-1 text-xs border-navy-700 hover:bg-navy-800 text-ivory"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        )}

        {/* Cooldown paused overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-10 bg-navy-950/60 flex items-center justify-center backdrop-blur-2xs pointer-events-none">
            <span className="text-xs font-bold text-gold-400 bg-navy-900/90 px-3 py-1 rounded-full border border-gold-400/30">
              Scan received · Paused
            </span>
          </div>
        )}
      </div>

      {/* Camera Status Bar */}
      <div className="p-2.5 sm:p-3 bg-navy-900/90 border-t border-navy-800/80 flex items-center justify-between text-xs text-mist">
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-gold-400 shrink-0" />
          <span className="font-medium text-navy-200 text-[11px] sm:text-xs">
            {isPaused ? "Scanner paused" : isScanning ? "Align QR inside box" : "Camera idle"}
          </span>
        </div>

        {isScanning && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live
          </span>
        )}
      </div>
    </div>
  );
}
