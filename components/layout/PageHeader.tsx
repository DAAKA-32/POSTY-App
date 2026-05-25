"use client";

import { type ReactNode } from "react";
import { useScrolledPast } from "@/hooks/scroll/useScrolledPast";

interface PageHeaderProps {
  title: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  maxWidthClass?: string;
}

const BASE_CLASSES =
  "sticky top-0 z-40 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out";

const SCROLLED_CLASSES =
  "backdrop-blur-[80px] backdrop-saturate-150 bg-white/75 dark:bg-dark-bg/70 border-b border-white/40 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]";

const IDLE_CLASSES = "bg-transparent border-b border-transparent";

export default function PageHeader({
  title,
  onBack,
  backLabel,
  actions,
  maxWidthClass = "max-w-4xl",
}: PageHeaderProps) {
  const { isScrolled, sentinelRef } = useScrolledPast();

  return (
    <>
      {/* 8px sentinel sits just above the sticky header. Once scroll pushes
          it out of the viewport (whichever ancestor actually scrolls), the
          observer flips isScrolled. -mb-2 collapses its layout footprint so
          the visible header still starts at y=0. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="h-2 w-full -mb-2 pointer-events-none"
      />
      <header className={`${BASE_CLASSES} ${isScrolled ? SCROLLED_CLASSES : IDLE_CLASSES}`}>
        <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="relative flex items-center h-16">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
                aria-label={backLabel}
              >
                <svg
                  className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel && <span className="hidden sm:inline">{backLabel}</span>}
              </button>
            ) : (
              <span aria-hidden className="w-5 h-5" />
            )}

            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </div>

            {actions && <div className="ml-auto z-10">{actions}</div>}
          </div>
        </div>
      </header>
    </>
  );
}
