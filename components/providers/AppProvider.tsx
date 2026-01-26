"use client";

import { ReactNode } from "react";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import SplashScreen from "@/components/ui/SplashScreen";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { NavigationStateProvider } from "@/contexts/NavigationStateContext";
import MobileGestureProvider, { SwipeIndicator } from "./MobileGestureProvider";

interface AppProviderProps {
  children: ReactNode;
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
