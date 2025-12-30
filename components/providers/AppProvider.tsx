"use client";

import { ReactNode } from "react";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import SplashScreen from "@/components/ui/SplashScreen";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Global app provider that wraps the entire app
 * Handles splash screen display during initialization
 */
export default function AppProvider({ children }: AppProviderProps) {
  const { isLoading } = useAppInitialization();

  return (
    <>
      <SplashScreen isLoading={isLoading} />
      {children}
    </>
  );
}
