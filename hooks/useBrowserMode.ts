"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BrowserModeInfo {
  /** True if running as installed PWA (standalone mode) */
  isPWA: boolean;
  /** True if running in a mobile browser (not PWA) */
  isMobileBrowser: boolean;
  /** True if on iOS Safari */
  isIOSSafari: boolean;
  /** True if on iOS Chrome */
  isIOSChrome: boolean;
  /** True if on Android Chrome */
  isAndroidChrome: boolean;
  /** True if mobile device detected */
  isMobile: boolean;
  /** Estimated browser UI height (address bar + bottom nav) */
  browserUIHeight: number;
  /** Safe extra padding to add for input areas in browser mode */
  inputBottomPadding: number;
  /** Whether the browser URL bar is likely visible */
  urlBarVisible: boolean;
  /** Dynamic viewport offset from visualViewport API */
  viewportOffset: number;
  /** Bottom offset for fixed elements (most reliable) */
  bottomOffset: number;
}

/**
 * Hook to detect browser mode vs PWA mode
 * Provides information about the browser environment to adjust UI accordingly
 *
 * On mobile browsers (not PWA), the bottom of the screen is often obscured by:
 * - Safari: bottom toolbar with share/tabs buttons (~44-50px)
 * - Chrome on iOS: bottom toolbar (~44px)
 * - Chrome on Android: navigation bar (varies by device)
 *
 * This hook uses the visualViewport API for accurate detection when available.
 */
export function useBrowserMode(): BrowserModeInfo {
  const initialInfoRef = useRef<BrowserModeInfo | null>(null);

  const getInitialInfo = (): BrowserModeInfo => {
    if (initialInfoRef.current) return initialInfoRef.current;

    const info: BrowserModeInfo = {
      isPWA: false,
      isMobileBrowser: false,
      isIOSSafari: false,
      isIOSChrome: false,
      isAndroidChrome: false,
      isMobile: false,
      browserUIHeight: 0,
      inputBottomPadding: 0,
      urlBarVisible: true,
      viewportOffset: 0,
      bottomOffset: 0,
    };

    initialInfoRef.current = info;
    return info;
  };

  const [browserInfo, setBrowserInfo] = useState<BrowserModeInfo>(getInitialInfo);

  // Calculate viewport difference using visualViewport API
  const calculateBrowserUI = useCallback(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent.toLowerCase();

    // Detect PWA mode
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    // Detect mobile
    const isMobile = /iphone|ipad|ipod|android/i.test(ua) || window.innerWidth < 768;

    // Detect specific browsers
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua);
    const isIOSChrome = isIOS && /crios/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isAndroidChrome = isAndroid && /chrome/i.test(ua);

    // Determine if in mobile browser (not PWA)
    const isMobileBrowser = isMobile && !isPWA;

    // Calculate browser UI height using visualViewport API when available
    let browserUIHeight = 0;
    let inputBottomPadding = 0;
    let viewportOffset = 0;
    let bottomOffset = 0;

    // Use visualViewport API for accurate bottom offset calculation
    // This is the most reliable method for modern browsers
    if (window.visualViewport && isMobileBrowser) {
      const vv = window.visualViewport;
      // The offset between window.innerHeight and visualViewport.height
      // indicates browser UI elements (keyboard, toolbars, etc.)
      viewportOffset = window.innerHeight - vv.height;

      // Calculate bottom offset: difference between layout viewport bottom and visual viewport bottom
      // This tells us how much of the bottom is covered by browser UI
      const layoutBottom = window.innerHeight;
      const visualBottom = vv.offsetTop + vv.height;
      bottomOffset = layoutBottom - visualBottom;

      // Additional offset for the URL bar area when it's visible
      if (bottomOffset < 0) bottomOffset = 0;
    }

    if (isMobileBrowser) {
      // Base values for different browsers
      if (isIOSSafari) {
        // Safari has a bottom toolbar (~44-50px) plus home indicator area
        browserUIHeight = 50;
        // Use visualViewport offset if available, otherwise use estimate
        inputBottomPadding = Math.max(bottomOffset, 75); // Increased for Safari
      } else if (isIOSChrome) {
        // Chrome on iOS has a similar bottom toolbar
        browserUIHeight = 44;
        inputBottomPadding = Math.max(bottomOffset, 70);
      } else if (isAndroidChrome) {
        // Android Chrome has variable bottom nav based on gesture vs button nav
        browserUIHeight = 36;
        inputBottomPadding = Math.max(bottomOffset, 65);
      } else {
        // Generic mobile browser fallback
        browserUIHeight = 40;
        inputBottomPadding = Math.max(bottomOffset, 68);
      }

      // If visualViewport detected a significant offset, use that
      if (bottomOffset > 10) {
        inputBottomPadding = bottomOffset + 20; // Add extra padding for safety
      }
    }

    // Detect if URL bar is visible (scrolled to top usually means URL bar is visible)
    const urlBarVisible = window.scrollY < 100;

    setBrowserInfo({
      isPWA,
      isMobileBrowser,
      isIOSSafari,
      isIOSChrome,
      isAndroidChrome,
      isMobile,
      browserUIHeight,
      inputBottomPadding,
      urlBarVisible,
      viewportOffset,
      bottomOffset,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial calculation
    calculateBrowserUI();

    // Recalculate on resize (orientation change, etc.)
    const handleResize = () => {
      calculateBrowserUI();
    };

    // Recalculate on scroll (URL bar visibility changes)
    const handleScroll = () => {
      // Debounce scroll updates
      setBrowserInfo((prev) => ({
        ...prev,
        urlBarVisible: window.scrollY < 100,
      }));
    };

    // Listen for visualViewport changes (most reliable for mobile)
    const handleViewportResize = () => {
      calculateBrowserUI();
    };

    // Listen for display mode changes (user installs PWA)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      calculateBrowserUI();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("orientationchange", handleResize);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    // Use visualViewport events when available
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
      window.visualViewport.addEventListener("scroll", handleViewportResize, { passive: true });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("orientationchange", handleResize);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
        window.visualViewport.removeEventListener("scroll", handleViewportResize);
      }
    };
  }, [calculateBrowserUI]);

  return browserInfo;
}

/**
 * CSS custom property setter for browser mode
 * Call this in a layout component to set CSS variables
 */
export function setBrowserModeCSSVars(info: BrowserModeInfo): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--browser-ui-height", `${info.browserUIHeight}px`);
  root.style.setProperty("--input-bottom-padding", `${info.inputBottomPadding}px`);
  root.style.setProperty("--is-mobile-browser", info.isMobileBrowser ? "1" : "0");
  root.style.setProperty("--viewport-offset", `${info.viewportOffset}px`);
  root.style.setProperty("--bottom-offset", `${info.bottomOffset}px`);

  // Set a data attribute for CSS targeting
  if (info.isMobileBrowser) {
    root.setAttribute("data-mobile-browser", "true");
  } else {
    root.removeAttribute("data-mobile-browser");
  }
}

export default useBrowserMode;
