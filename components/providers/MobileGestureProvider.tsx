"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useSidebar } from "@/contexts/SidebarContext";

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
const SWIPE_EDGE_ZONE = 30;
// Minimum swipe distance to trigger action
const MIN_SWIPE_DISTANCE = 80;
// Maximum swipe time (in ms)
const MAX_SWIPE_TIME = 500;
// Sidebar width for close detection
const SIDEBAR_WIDTH = 320;

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
      isTracking = false;
      swipeType = null;
      isSwipeGesture = false;
      setSwipeProgress(0);
      setIsSwipingToOpen(false);
      setIsSwipingToClose(false);
    };

    const handleTouchCancel = () => {
      resetSwipeState();
    };

    // Add event listeners
    // Use passive: false for touchmove and touchend to allow preventDefault
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
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
      /* These styles only apply when NOT on landing page or pages with force-scroll-enabled */
      html:not(.landing-scroll-enabled):not(.force-scroll-enabled),
      body:not(.landing-scroll-enabled):not(.force-scroll-enabled) {
        overscroll-behavior: none;
        overscroll-behavior-x: none;
        overscroll-behavior-y: none;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y pinch-zoom;
      }
      /* Prevent pull-to-refresh on the whole page (mobile app only) */
      body:not(.landing-scroll-enabled):not(.force-scroll-enabled) {
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
      body.sidebar-open *:not(input):not(textarea):not(select):not([contenteditable="true"]) {
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
      // Block swipes starting from the very edge (browser gesture zone)
      if (touch.clientX <= 15 || touch.clientX >= window.innerWidth - 15) {
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
 * SwipeIndicator - Visual feedback for swipe gesture
 * Shows a subtle indicator when user is swiping to open/close sidebar
 */
export function SwipeIndicator() {
  const { isSwipingToOpen, isSwipingToClose, swipeProgress } = useMobileGesture();

  // Don't show indicator if not swiping
  if (!isSwipingToOpen && !isSwipingToClose) return null;

  return (
    <div
      className={`
        fixed top-1/2 -translate-y-1/2 z-[100] pointer-events-none
        transition-opacity duration-150
        ${isSwipingToOpen ? "left-0" : "right-0"}
      `}
      style={{
        opacity: swipeProgress * 0.8,
        transform: `translateY(-50%) translateX(${isSwipingToOpen ? swipeProgress * 20 : -swipeProgress * 20}px)`,
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
            d={isSwipingToOpen ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
          />
        </svg>
      </div>
    </div>
  );
}
