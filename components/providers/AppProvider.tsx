"use client";

import { ReactNode } from "react";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import SplashScreen from "@/components/ui/SplashScreen";
import MobileGestureProvider, { SwipeIndicator } from "./MobileGestureProvider";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Global app provider that wraps the entire app
 * - Landing/Auth pages: NO splash screen (instant display)
 * - App pages: Minimal splash for smooth transition
 * Provides mobile gesture support (swipe back navigation)
 */
export default function AppProvider({ children }: AppProviderProps) {
  const { isLoading, isLandingPage } = useAppInitialization();

  return (
    <>
      {/* No splash screen for landing/auth pages - instant display */}
      {!isLandingPage && <SplashScreen isLoading={isLoading} />}
      <MobileGestureProvider>
        <SwipeIndicator />
        {children}
      </MobileGestureProvider>
    </>
  );
}
