"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/contexts/SidebarContext";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";

/**
 * MobileGestureProvider - Gestionnaire de gestes tactiles pour mobile
 *
 * COMPORTEMENT STRICT (NE PAS MODIFIER) :
 * - Swipe gauche -> droite = OUVRIR la sidebar UNIQUEMENT (si fermée)
 * - Swipe droite -> gauche = FERMER la sidebar (si ouverte)
 * - AUCUN retour arriere
 * - AUCUNE navigation entre pages
 * - AUCUNE interaction avec l'historique du navigateur
 * - AUCUN changement de thème
 * - AUCUN autre effet secondaire
 *
 * Ce comportement est similaire aux apps SaaS modernes (ChatGPT, Notion, Slack)
 *
 * IMPORTANT: Ce provider utilise maintenant le SidebarContext unifié
 * pour éviter toute duplication d'état entre mobile et desktop.
 *
 * NOTE: Utilise des refs pour éviter les stale closures dans les event handlers.
 */

interface MobileGestureContextType {
  // Sidebar state (from unified SidebarContext)
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  // Swipe feedback (local to this provider)
  swipeProgress: number;
  isSwipingToOpen: boolean;
  isSwipingToClose: boolean;
}

const MobileGestureContext = createContext<MobileGestureContextType>({
  isSidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
  swipeProgress: 0,
  isSwipingToOpen: false,
  isSwipingToClose: false,
});

export function useMobileGesture() {
  return useContext(MobileGestureContext);
}

interface MobileGestureProviderProps {
  children: ReactNode;
}

// Edge zone width for starting swipe (in pixels)
// Widened from 30 → 40 so the gesture catches even when the user's thumb
// lands slightly inside the viewport — matches ChatGPT / Telegram tolerance.
const SWIPE_EDGE_ZONE = 40;
// Minimum swipe distance to trigger action
const MIN_SWIPE_DISTANCE = 80;
// Maximum swipe time (in ms)
const MAX_SWIPE_TIME = 500;
// Sidebar width for close detection
const SIDEBAR_WIDTH = 320;
// Distance after which we trigger a soft haptic to signal "tracking"
const HAPTIC_START_THRESHOLD = 24;

export default function MobileGestureProvider({ children }: MobileGestureProviderProps) {
  // Use the unified sidebar context instead of local state
  const { isOpen: isSidebarOpen, open: openSidebar, close: closeSidebar, toggle: toggleSidebar } = useSidebar();

  // Local state for swipe feedback only
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingToOpen, setIsSwipingToOpen] = useState(false);
  const [isSwipingToClose, setIsSwipingToClose] = useState(false);

  // Refs to track current state without stale closures
  const isSidebarOpenRef = useRef(isSidebarOpen);
  const openSidebarRef = useRef(openSidebar);
  const closeSidebarRef = useRef(closeSidebar);

  // Keep refs in sync with state
  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  useEffect(() => {
    openSidebarRef.current = openSidebar;
    closeSidebarRef.current = closeSidebar;
  }, [openSidebar, closeSidebar]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only enable on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    // Also check for touch capability
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!isMobile && !isTouchDevice) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;
    let swipeType: "open" | "close" | null = null;
    let isSwipeGesture = false; // Flag to indicate we're handling a swipe
    let hasHapticFired = false; // Soft haptic only once per gesture

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const sidebarOpen = isSidebarOpenRef.current;

      // Reset swipe gesture flag
      isSwipeGesture = false;

      // Si swipe-back est activé, ne pas gérer les swipes du bord gauche
      // SwipeBackProvider s'en charge pour la navigation retour
      const swipeBackEnabled = document.body.classList.contains("swipe-back-enabled");

      // Determine swipe type based on starting position and sidebar state
      if (!sidebarOpen && touch.clientX <= SWIPE_EDGE_ZONE && !swipeBackEnabled) {
        // Starting from left edge when sidebar is closed = try to open
        // (sauf si swipe-back est activé sur cette page)
        swipeType = "open";
        isTracking = true;
      } else if (sidebarOpen && touch.clientX <= SIDEBAR_WIDTH) {
        // Starting within sidebar area when open = try to close
        swipeType = "close";
        isTracking = true;
      } else {
        swipeType = null;
        isTracking = false;
      }

      if (isTracking) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        hasHapticFired = false;
        // Attach the non-passive touchmove ONLY now that a real swipe gesture
        // is being tracked (edge-open or sidebar-close). Keeping it off the
        // document the rest of the time lets the browser scroll on the
        // compositor thread — a permanent passive:false touchmove forces every
        // scroll through the main thread (the #1 transversal mobile-jank source).
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || !swipeType) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Check if horizontal swipe (not scrolling)
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

      if (!isHorizontalSwipe) {
        // Not a horizontal swipe, let the page scroll
        return;
      }

      // Mark that we're handling a swipe gesture
      isSwipeGesture = true;

      // ALWAYS prevent default for horizontal swipes in tracked zones
      // This blocks browser back/forward gestures and pull-to-refresh
      e.preventDefault();
      e.stopPropagation();

      // Fire a single soft haptic once the gesture is clearly horizontal —
      // signals "tracking" to the user without waiting for commit.
      const absDeltaX = Math.abs(deltaX);
      if (!hasHapticFired && absDeltaX >= HAPTIC_START_THRESHOLD) {
        triggerHaptic("light");
        hasHapticFired = true;
      }

      if (swipeType === "open" && deltaX > 0) {
        // Swiping right to open (only when sidebar is closed)
        const progress = Math.min(deltaX / MIN_SWIPE_DISTANCE, 1);
        setSwipeProgress(progress);
        setIsSwipingToOpen(true);
        setIsSwipingToClose(false);
      } else if (swipeType === "close" && deltaX < 0) {
        // Swiping left to close (only when sidebar is open)
        const progress = Math.min(Math.abs(deltaX) / MIN_SWIPE_DISTANCE, 1);
        setSwipeProgress(progress);
        setIsSwipingToClose(true);
        setIsSwipingToOpen(false);
      }
      // If sidebar is open and user swipes RIGHT: do nothing but block default behavior
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking || !swipeType) {
        resetSwipeState();
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsedTime = Date.now() - startTime;
      const sidebarOpen = isSidebarOpenRef.current;

      // Check for valid swipe
      const isValidSwipe =
        Math.abs(deltaX) >= MIN_SWIPE_DISTANCE &&
        Math.abs(deltaY) < Math.abs(deltaX) && // More horizontal than vertical
        elapsedTime < MAX_SWIPE_TIME;

      if (isValidSwipe && isSwipeGesture) {
        // Prevent any click/tap events from firing after swipe
        e.preventDefault();

        if (swipeType === "open" && deltaX > 0 && !sidebarOpen) {
          // Valid swipe right to open
          openSidebarRef.current();
        } else if (swipeType === "close" && deltaX < 0 && sidebarOpen) {
          // Valid swipe left to close
          closeSidebarRef.current();
        }
      }

      resetSwipeState();
    };

    const resetSwipeState = () => {
      // Detach the on-demand touchmove listener so it never lingers between
      // gestures (keeps normal scrolling on the compositor thread).
      document.removeEventListener("touchmove", handleTouchMove);
      isTracking = false;
      swipeType = null;
      isSwipeGesture = false;
      hasHapticFired = false;
      setSwipeProgress(0);
      setIsSwipingToOpen(false);
      setIsSwipingToClose(false);
    };

    const handleTouchCancel = () => {
      resetSwipeState();
    };

    // Add event listeners.
    // touchmove is NOT registered globally — it's attached on demand inside
    // handleTouchStart only while a swipe gesture is actually tracked, and
    // detached in resetSwipeState. This restores compositor-thread scrolling for
    // every normal scroll. touchend stays global (it never fires during a scroll)
    // to reset state and cancel the post-swipe click.
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []); // Empty deps - refs handle state changes

  // Block browser gestures (back/forward, pull-to-refresh) on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use media query to detect desktop with mouse/trackpad
    // pointer: fine = mouse/trackpad (precise pointer)
    // hover: hover = can hover (not touch-primary device)
    const isDesktopWithMouse = window.matchMedia("(pointer: fine) and (hover: hover)").matches;

    // Skip ALL style injection on desktop - let CSS handle scroll
    if (isDesktopWithMouse) return;

    // Disable overscroll behavior to prevent iOS/Android edge gestures
    const style = document.createElement("style");
    style.id = "posty-gesture-blocker";
    style.textContent = `
      /* MOBILE ONLY: Gesture blocking styles */
      /* These styles only apply when NOT on landing/onboarding/subscription or force-scroll pages */
      html:not(.landing-scroll-enabled):not(.force-scroll-enabled):not(.onboarding-scroll-enabled):not(.subscription-scroll-enabled):not(.seo-scroll-enabled),
      body:not(.landing-scroll-enabled):not(.force-scroll-enabled):not(.onboarding-scroll-enabled):not(.subscription-scroll-enabled):not(.seo-scroll-enabled) {
        overscroll-behavior: none;
        overscroll-behavior-x: none;
        overscroll-behavior-y: none;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y pinch-zoom;
      }
      /* Prevent pull-to-refresh on the whole page (mobile app only) */
      body:not(.landing-scroll-enabled):not(.force-scroll-enabled):not(.onboarding-scroll-enabled):not(.subscription-scroll-enabled):not(.seo-scroll-enabled) {
        overflow-y: auto;
        overflow-x: hidden;
      }
      /* Allow full scrolling on pages with force-scroll-enabled */
      html.force-scroll-enabled,
      body.force-scroll-enabled {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: auto !important;
      }
      /* Block all horizontal gestures when sidebar is open */
      body.sidebar-open {
        touch-action: pan-y !important;
        overscroll-behavior-x: none !important;
      }
      body.sidebar-open *:not(input):not(textarea):not(select):not([contenteditable="true"]):not(a):not(button):not([role="button"]) {
        touch-action: pan-y !important;
      }
      /* Always allow full touch interactions on form elements */
      input, textarea, select, [contenteditable="true"] {
        touch-action: auto !important;
        -webkit-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // Block edge swipes that could trigger browser navigation
    const blockEdgeSwipe = (e: TouchEvent) => {
      // Ne pas bloquer si swipe-back est activé sur cette page
      // SwipeBackProvider gère les edge swipes pour la navigation retour
      if (document.body.classList.contains("swipe-back-enabled")) {
        return;
      }

      const touch = e.touches[0];
      // Block swipes starting from the very edge (browser gesture zone).
      // 20px — wider than the system swipe-back detection zone on iOS
      // Safari (~12-16px) so we get the touchstart first and can call
      // preventDefault before the OS-level back gesture fires.
      if (touch.clientX <= 20 || touch.clientX >= window.innerWidth - 20) {
        // Only block if it's a horizontal movement
        if (e.touches.length === 1) {
          const target = e.target as HTMLElement;
          // Don't block if interacting with form elements
          if (!["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
            e.preventDefault();
          }
        }
      }
    };

    // Add listener for edge swipes with passive: false to allow preventDefault
    document.addEventListener("touchstart", blockEdgeSwipe, { passive: false, capture: true });

    return () => {
      style.remove();
      document.removeEventListener("touchstart", blockEdgeSwipe, { capture: true });
    };
  }, []);

  // Add/remove sidebar-open class on body when sidebar state changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isSidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }

    return () => {
      document.body.classList.remove("sidebar-open");
    };
  }, [isSidebarOpen]);

  return (
    <MobileGestureContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        swipeProgress,
        isSwipingToOpen,
        isSwipingToClose,
      }}
    >
      {children}
    </MobileGestureContext.Provider>
  );
}

/**
 * SwipeIndicator — Premium visual feedback for the swipe-to-open / swipe-to-close
 * gesture. Mirrors the polish of SwipeBackIndicator: gradient peek bar at the
 * tracked edge, animated chevron with backdrop-blur, and a soft viewport shade
 * that ramps with progress. Pointer-events disabled so it never steals taps.
 */
export function SwipeIndicator() {
  const { isSwipingToOpen, isSwipingToClose, swipeProgress } = useMobileGesture();
  const isActive = isSwipingToOpen || isSwipingToClose;
  const fromLeft = isSwipingToOpen;

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Peek gradient at the tracked edge — hints "sidebar is coming from here" */}
          <motion.div
            initial={{ opacity: 0, x: fromLeft ? -60 : 60 }}
            animate={{
              opacity: swipeProgress * 0.5,
              x: fromLeft ? swipeProgress * 60 - 60 : 60 - swipeProgress * 60,
            }}
            exit={{ opacity: 0, x: fromLeft ? -60 : 60 }}
            transition={{ duration: 0.1 }}
            className={`fixed inset-y-0 ${fromLeft ? "left-0" : "right-0"} w-20 z-[9998] pointer-events-none`}
            style={{
              background: fromLeft
                ? "linear-gradient(to right, rgba(139, 92, 246, 0.18), transparent)"
                : "linear-gradient(to left, rgba(139, 92, 246, 0.18), transparent)",
            }}
          />

          {/* Chevron capsule — direction reflects open vs close */}
          <motion.div
            initial={{ opacity: 0, x: fromLeft ? -20 : 20, scale: 0.85 }}
            animate={{
              opacity: Math.min(swipeProgress * 1.5, 1),
              x: fromLeft ? swipeProgress * 28 : -swipeProgress * 28,
              scale: 0.9 + swipeProgress * 0.1,
            }}
            exit={{ opacity: 0, x: fromLeft ? -20 : 20, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`fixed top-1/2 -translate-y-1/2 ${fromLeft ? "left-2" : "right-2"} z-[9999] pointer-events-none`}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg,
                  rgba(139, 92, 246, ${0.22 + swipeProgress * 0.55}),
                  rgba(168, 85, 247, ${0.18 + swipeProgress * 0.5})
                )`,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid rgba(139, 92, 246, ${0.3 + swipeProgress * 0.4})`,
                boxShadow: `0 6px 22px rgba(139, 92, 246, ${swipeProgress * 0.35})`,
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: `rgba(255, 255, 255, ${0.85 + swipeProgress * 0.15})` }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d={fromLeft ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                />
              </svg>
            </div>
          </motion.div>

          {/* Subtle viewport shade — depth cue without blocking interaction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeProgress * 0.12 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997] pointer-events-none bg-black"
          />
        </>
      )}
    </AnimatePresence>
  );
}
