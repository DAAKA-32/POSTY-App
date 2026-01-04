"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface MobileGestureContextType {
  isSwipingBack: boolean;
  swipeProgress: number;
  canGoBack: boolean;
}

const MobileGestureContext = createContext<MobileGestureContextType>({
  isSwipingBack: false,
  swipeProgress: 0,
  canGoBack: false,
});

export function useMobileGesture() {
  return useContext(MobileGestureContext);
}

interface MobileGestureProviderProps {
  children: ReactNode;
}

export default function MobileGestureProvider({ children }: MobileGestureProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);

  // Track navigation history
  useEffect(() => {
    // Check if we can go back (not on main pages)
    const mainPages = ["/", "/login", "/signup", "/onboarding"];
    setCanGoBack(!mainPages.includes(pathname));
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;
    let swipeElement: HTMLElement | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];

      // Only start swipe if starting from left edge (within 25px)
      if (touch.clientX <= 25 && canGoBack) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        isTracking = true;
        swipeElement = document.getElementById("main-content");
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Only proceed if horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        const progress = Math.min(deltaX / (window.innerWidth * 0.4), 1);
        setSwipeProgress(progress);
        setIsSwipingBack(true);

        // Apply visual feedback
        if (swipeElement && progress > 0.1) {
          swipeElement.style.transform = `translateX(${deltaX * 0.3}px)`;
          swipeElement.style.opacity = `${1 - progress * 0.2}`;
        }

        // Prevent scrolling during swipe
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsedTime = Date.now() - startTime;

      // Reset visual state
      if (swipeElement) {
        swipeElement.style.transform = "";
        swipeElement.style.opacity = "";
      }

      setIsSwipingBack(false);
      setSwipeProgress(0);
      isTracking = false;

      // Check for valid swipe back
      if (
        deltaX > 100 && // Minimum distance
        Math.abs(deltaY) < 80 && // Not too vertical
        elapsedTime < 400 && // Within time limit
        canGoBack
      ) {
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        router.back();
      }
    };

    // Add passive: false to allow preventDefault
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [canGoBack, router]);

  return (
    <MobileGestureContext.Provider value={{ isSwipingBack, swipeProgress, canGoBack }}>
      <div id="main-content" className="transition-transform duration-200 ease-out">
        {children}
      </div>
    </MobileGestureContext.Provider>
  );
}

// Swipe indicator component for edge feedback
export function SwipeIndicator() {
  const { isSwipingBack, swipeProgress } = useMobileGesture();

  if (!isSwipingBack) return null;

  return (
    <div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
      style={{
        opacity: swipeProgress,
        transform: `translateX(${swipeProgress * 30}px)`,
      }}
    >
      <div className="w-8 h-8 bg-dark-card border border-dark-border rounded-full flex items-center justify-center shadow-lg">
        <svg
          className="w-4 h-4 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </div>
    </div>
  );
}
