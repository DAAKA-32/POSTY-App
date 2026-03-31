"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppInitialization } from "@/hooks/app/useAppInitialization";
import SplashScreen from "@/components/ui/SplashScreen";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { NavigationStateProvider } from "@/contexts/NavigationStateContext";
import MobileGestureProvider, { SwipeIndicator } from "./MobileGestureProvider";
import { forceUnlockScroll } from "@/hooks/ui/useScrollLock";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * RouteChangeScrollCleanup - Force-releases stale scroll locks on navigation.
 * If a modal/sheet locked scroll and the user navigates away before it unlocks,
 * the lock persists and blocks all interaction. This component fixes that.
 */
function RouteChangeScrollCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    // On every route change, ensure scroll is not stuck in locked state
    forceUnlockScroll();
  }, [pathname]);

  return null;
}

/**
 * Global app provider that wraps the entire app
 * - Landing/Auth pages: NO splash screen (instant display)
 * - App pages: Minimal splash for smooth transition
 *
 * Provider hierarchy (order matters):
 * 1. NavigationStateProvider - State caching for back navigation (must be first)
 * 2. SidebarProvider - Unified sidebar state (used by MobileGestureProvider)
 * 3. MobileGestureProvider - Touch gesture handling for mobile (uses SidebarContext)
 */
export default function AppProvider({ children }: AppProviderProps) {
  const { isLoading, isLandingPage } = useAppInitialization();

  return (
    <>
      {/* No splash screen for landing/auth pages - instant display */}
      {!isLandingPage && <SplashScreen isLoading={isLoading} />}
      <RouteChangeScrollCleanup />
      <NavigationStateProvider>
        <SidebarProvider>
          <MobileGestureProvider>
            <SwipeIndicator />
            {children}
          </MobileGestureProvider>
        </SidebarProvider>
      </NavigationStateProvider>
    </>
  );
}
