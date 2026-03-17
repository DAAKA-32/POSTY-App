"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "@/types";
import { useLocalStorage, STORAGE_KEYS } from "@/hooks/data/useLocalStorage";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { canUsePlatform } from "@/lib/config/permissions";

// Storage key for platform selection
const PLATFORM_SELECTION_KEY = "posty_last_platform_selection";

interface UsePlatformSelectionOptions {
  /** Currently connected platforms */
  connectedPlatforms: Platform[];
  /** Default platforms to select if no saved selection exists */
  defaultPlatforms?: Platform[];
}

interface UsePlatformSelectionReturn {
  /** Currently selected platforms */
  selectedPlatforms: Platform[];
  /** Toggle a platform selection */
  togglePlatform: (platform: Platform) => void;
  /** Set platforms directly */
  setSelectedPlatforms: (platforms: Platform[]) => void;
  /** Save current selection as preferred */
  saveSelection: () => void;
  /** Reset to default selection */
  resetSelection: () => void;
}

/**
 * Hook for managing platform selection with persistence
 * - Remembers last selection across sessions
 * - Filters out disconnected/inaccessible platforms
 * - Only selects platforms the user has access to
 */
export function usePlatformSelection({
  connectedPlatforms,
  defaultPlatforms = ["linkedin"],
}: UsePlatformSelectionOptions): UsePlatformSelectionReturn {
  const { subscription } = useSubscription();

  // Use refs to avoid infinite loops with array dependencies
  const connectedPlatformsRef = useRef(connectedPlatforms);
  const defaultPlatformsRef = useRef(defaultPlatforms);
  connectedPlatformsRef.current = connectedPlatforms;
  defaultPlatformsRef.current = defaultPlatforms;

  // Persisted last selection
  const [savedSelection, setSavedSelection] = useLocalStorage<Platform[]>(
    PLATFORM_SELECTION_KEY,
    defaultPlatforms
  );

  // Current session selection
  const [selectedPlatforms, setSelectedPlatformsState] = useState<Platform[]>([]);

  // Track initialization to prevent infinite loops
  const isInitialized = useRef(false);

  // Filter platforms to only include connected and accessible ones
  const filterValidPlatforms = useCallback(
    (platforms: Platform[]): Platform[] => {
      return platforms.filter((platform) => {
        // Must be connected
        if (!connectedPlatformsRef.current.includes(platform)) {
          return false;
        }
        // Must have plan access
        const access = canUsePlatform(subscription, platform);
        return access.allowed;
      });
    },
    [subscription]
  );

  // Initialize selection from saved preferences (only once)
  useEffect(() => {
    // Prevent re-initialization that causes infinite loop
    if (isInitialized.current) return;

    const validSavedSelection = filterValidPlatforms(savedSelection);

    // If saved selection has valid platforms, use those
    if (validSavedSelection.length > 0) {
      setSelectedPlatformsState(validSavedSelection);
      isInitialized.current = true;
    } else {
      // Otherwise, default to first connected platform or default
      const validDefaults = filterValidPlatforms(defaultPlatformsRef.current);
      if (validDefaults.length > 0) {
        setSelectedPlatformsState(validDefaults);
        isInitialized.current = true;
      } else if (connectedPlatformsRef.current.length > 0) {
        // Fallback to first connected platform with access
        const firstValidPlatform = filterValidPlatforms(connectedPlatformsRef.current);
        setSelectedPlatformsState(firstValidPlatform.slice(0, 1));
        isInitialized.current = true;
      }
    }
  }, [savedSelection, filterValidPlatforms]);

  // Toggle a platform selection
  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatformsState((prev) => {
      const isSelected = prev.includes(platform);
      if (isSelected) {
        // Remove platform
        return prev.filter((p) => p !== platform);
      } else {
        // Add platform
        return [...prev, platform];
      }
    });
  }, []);

  // Set platforms directly
  const setSelectedPlatforms = useCallback((platforms: Platform[]) => {
    const validPlatforms = filterValidPlatforms(platforms);
    setSelectedPlatformsState(validPlatforms);
  }, [filterValidPlatforms]);

  // Save current selection for future sessions
  const saveSelection = useCallback(() => {
    if (selectedPlatforms.length > 0) {
      setSavedSelection(selectedPlatforms);
    }
  }, [selectedPlatforms, setSavedSelection]);

  // Reset to default selection
  const resetSelection = useCallback(() => {
    const validDefaults = filterValidPlatforms(defaultPlatformsRef.current);
    setSelectedPlatformsState(validDefaults.length > 0 ? validDefaults : []);
  }, [filterValidPlatforms]);

  return {
    selectedPlatforms,
    togglePlatform,
    setSelectedPlatforms,
    saveSelection,
    resetSelection,
  };
}

// Add to storage keys for consistency
export const PLATFORM_STORAGE_KEYS = {
  ...STORAGE_KEYS,
  PLATFORM_SELECTION: PLATFORM_SELECTION_KEY,
} as const;

export default usePlatformSelection;
