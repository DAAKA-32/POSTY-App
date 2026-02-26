"use client";

import { useEffect } from "react";

/**
 * LandscapeBlocker — Blocks landscape mode on mobile devices.
 *
 * Strategy (multi-layer):
 * 1. screen.orientation.lock('portrait') — works on Android PWA / Chrome
 * 2. CSS overlay via .landscape-blocker class — universal fallback (iOS Safari, etc.)
 *    Only activates when orientation=landscape AND max-height=500px (phones only, not tablets)
 */
export default function LandscapeBlocker() {
  useEffect(() => {
    // Try the Screen Orientation API (works in PWA mode on Android Chrome)
    if (
      typeof screen !== "undefined" &&
      screen.orientation &&
      typeof (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock === "function"
    ) {
      (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> })
        .lock("portrait")
        .catch(() => {
          // iOS Safari & non-PWA browsers silently deny — the CSS overlay handles those
        });
    }
  }, []);

  return (
    <div className="landscape-blocker" aria-hidden="true">
      <div className="landscape-blocker__inner">
        {/* Rotate phone icon */}
        <div className="landscape-blocker__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Phone outline */}
            <rect x="7" y="2" width="10" height="16" rx="2" ry="2" />
            <line x1="12" y1="17" x2="12" y2="17.01" />
            {/* Rotation arrow */}
            <path d="M3 9a9 9 0 0 1 9-9" strokeDasharray="3 2" />
            <polyline points="3 3 3 9 9 9" />
          </svg>
        </div>
        <p className="landscape-blocker__title">Tournez votre téléphone</p>
        <p className="landscape-blocker__subtitle">
          Posty est optimisé pour le mode portrait.
        </p>
      </div>
    </div>
  );
}
