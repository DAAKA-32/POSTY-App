/**
 * Haptic feedback utility for mobile devices.
 * Triggers a subtle vibration when the AI finishes generating a response.
 */

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || "ontouchstart" in window;
}

function isPageVisible(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible";
}

/**
 * Trigger a light haptic feedback (20ms vibration).
 * Only fires on mobile devices when the page is in the foreground.
 */
export function triggerHaptic(): void {
  if (!isMobile() || !isPageVisible()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(20);
  }
}
