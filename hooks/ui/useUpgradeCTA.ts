import { useState, useEffect } from "react";
import { PlanType } from "@/lib/config/plans";

interface UpgradeCTAState {
  shouldShow: boolean;
  dismiss: () => void;
  dismissPermanently: () => void;
  dismissTemporarily: (hours?: number) => void;
}

interface DismissalData {
  dismissedAt: number;
  type: "permanent" | "temporary";
  expiresAt?: number;
}

/**
 * useUpgradeCTA - Intelligent upgrade CTA management
 *
 * Features:
 * - localStorage persistence for dismissals
 * - Temporary vs permanent dismissal
 * - Intelligent timing based on user activity
 * - Separate tracking per variant and upgrade path
 *
 * @param variant - CTA variant (inline, banner, minimal)
 * @param currentPlan - User's current plan (null if unsubscribed)
 * @param messageCount - Number of messages sent in current session
 * @param sessionDuration - Time spent in current session (seconds)
 */
export function useUpgradeCTA(
  variant: "inline" | "banner" | "minimal",
  currentPlan: PlanType | null,
  messageCount: number = 0,
  sessionDuration: number = 0
): UpgradeCTAState {
  const [shouldShow, setShouldShow] = useState(false);

  // Generate unique key for this CTA instance
  const getStorageKey = () => {
    const upgradePath = !currentPlan ? "none_to_pro" : "pro_to_max";
    return `upgrade_cta_${variant}_${upgradePath}`;
  };

  // Check if CTA was dismissed
  const isDismissed = (): boolean => {
    try {
      const key = getStorageKey();
      const stored = localStorage.getItem(key);

      if (!stored) return false;

      const data: DismissalData = JSON.parse(stored);

      // Permanent dismissal
      if (data.type === "permanent") {
        return true;
      }

      // Temporary dismissal - check if expired
      if (data.type === "temporary" && data.expiresAt) {
        const now = Date.now();
        if (now < data.expiresAt) {
          return true; // Still dismissed
        } else {
          // Expired, remove from storage
          localStorage.removeItem(key);
          return false;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  // Intelligent timing logic
  const shouldShowBasedOnTiming = (): boolean => {
    // Don't show if already dismissed
    if (isDismissed()) return false;

    // Variant-specific timing rules
    switch (variant) {
      case "inline":
        // Inline: Show after 3 messages OR 2 minutes of activity
        return messageCount >= 3 || sessionDuration >= 120;

      case "banner":
        // Banner: Show after 5 messages OR 5 minutes of activity
        return messageCount >= 5 || sessionDuration >= 300;

      case "minimal":
        // Minimal: Always show (least intrusive)
        return true;

      default:
        return false;
    }
  };

  // Update visibility when conditions change
  useEffect(() => {
    const show = shouldShowBasedOnTiming();
    setShouldShow(show);
  }, [variant, messageCount, sessionDuration]);

  // Dismiss temporarily (default: 24 hours)
  const dismissTemporarily = (hours: number = 24) => {
    try {
      const key = getStorageKey();
      const data: DismissalData = {
        dismissedAt: Date.now(),
        type: "temporary",
        expiresAt: Date.now() + hours * 60 * 60 * 1000,
      };
      localStorage.setItem(key, JSON.stringify(data));
      setShouldShow(false);
    } catch (error) {
      console.error("Failed to save dismissal state:", error);
    }
  };

  // Dismiss permanently (won't show again for this upgrade path)
  const dismissPermanently = () => {
    try {
      const key = getStorageKey();
      const data: DismissalData = {
        dismissedAt: Date.now(),
        type: "permanent",
      };
      localStorage.setItem(key, JSON.stringify(data));
      setShouldShow(false);
    } catch (error) {
      console.error("Failed to save dismissal state:", error);
    }
  };

  // Default dismiss (temporary for 24h)
  const dismiss = () => {
    dismissTemporarily(24);
  };

  return {
    shouldShow,
    dismiss,
    dismissPermanently,
    dismissTemporarily,
  };
}
