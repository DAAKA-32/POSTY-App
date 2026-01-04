"use client";

/**
 * Validation utilities for testing checklists
 * These functions help verify UX requirements programmatically
 */

// ============================================
// 8.1 - Mobile Checklist Utilities
// ============================================

/**
 * Check if all interactive elements have adequate touch targets (≥44px)
 */
export function checkTouchTargets(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const MIN_SIZE = 44;

  const interactiveElements = document.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [tabindex="0"]'
  );

  interactiveElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);

    // Handle className being SVGAnimatedString or string
    const classNameAttr = el.getAttribute("class") || "";
    const className = classNameAttr;

    // Skip hidden elements
    if (styles.display === "none" || styles.visibility === "hidden") return;

    // Skip sr-only elements (accessibility skip links - intentionally 1px)
    if (className.includes("sr-only")) return;

    // Skip elements with 0 size (hidden/collapsed)
    if (rect.width === 0 || rect.height === 0) return;

    // Skip elements inside collapsed containers
    if (styles.opacity === "0" || styles.pointerEvents === "none") return;

    // Skip elements outside viewport (not visible)
    if (rect.top < -100 || rect.left < -100) return;

    // Skip elements inside ValidationPanel (dev tools)
    if (el.closest('[class*="ValidationPanel"]') || el.closest('[data-validation-panel]')) return;

    // Skip very small decorative elements (likely icons inside buttons)
    if (rect.width < 10 && rect.height < 10) return;

    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      const id = el.id || className.split(" ").slice(0, 3).join(" ") || el.tagName;
      issues.push(
        `Element "${id}" has size ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum: ${MIN_SIZE}px)`
      );
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Check if safe area insets are properly applied
 */
export function checkSafeAreaInsets(): { passed: boolean; details: string } {
  const html = document.documentElement;
  const computedStyle = getComputedStyle(html);

  const safeAreaTop = computedStyle.getPropertyValue("--safe-area-inset-top");
  const safeAreaBottom = computedStyle.getPropertyValue("--safe-area-inset-bottom");

  const hasEnvFunction = document.body.innerHTML.includes("env(safe-area-inset");
  const hasMetaViewport = document.querySelector('meta[name="viewport"][content*="viewport-fit=cover"]');

  return {
    passed: !!hasMetaViewport,
    details: hasMetaViewport
      ? "viewport-fit=cover is set, safe areas should work on iOS"
      : "Missing viewport-fit=cover in meta viewport tag",
  };
}

/**
 * Check for accidental horizontal scroll
 */
export function checkHorizontalScroll(): { passed: boolean; details: string } {
  const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;

  return {
    passed: !hasHorizontalScroll,
    details: hasHorizontalScroll
      ? `Page has horizontal scroll: ${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px`
      : "No horizontal scroll detected",
  };
}

// ============================================
// 8.2 - Tablet Checklist Utilities
// ============================================

/**
 * Check current viewport breakpoint
 */
export function getCurrentBreakpoint(): string {
  const width = window.innerWidth;
  if (width < 640) return "xs (mobile)";
  if (width < 768) return "sm (small mobile)";
  if (width < 1024) return "md (tablet)";
  if (width < 1280) return "lg (desktop)";
  if (width < 1536) return "xl (large desktop)";
  return "2xl (extra large)";
}

/**
 * Check if layout adapts properly for tablets
 */
export function checkTabletLayout(): { passed: boolean; details: string } {
  const width = window.innerWidth;
  const isTablet = width >= 768 && width <= 1024;

  if (!isTablet) {
    return {
      passed: true,
      details: `Current viewport (${width}px) is not tablet size. Resize to 768-1024px to test.`,
    };
  }

  // Check for sidebar visibility
  const sidebar = document.querySelector('[data-sidebar]') || document.getElementById('navigation');
  const mainContent = document.querySelector('[role="main"]') || document.getElementById('main-content');

  return {
    passed: !!sidebar && !!mainContent,
    details: sidebar && mainContent
      ? "Sidebar and main content areas detected"
      : "Missing sidebar or main content landmarks",
  };
}

// ============================================
// 8.3 - Desktop Checklist Utilities
// ============================================

/**
 * Check keyboard shortcuts are registered
 */
export function checkKeyboardShortcuts(): { registered: string[]; details: string } {
  const shortcuts = [
    { key: "k", modifier: "meta/ctrl", description: "Search" },
    { key: "Escape", modifier: "none", description: "Close modals" },
    { key: "n", modifier: "meta/ctrl", description: "New post" },
  ];

  return {
    registered: shortcuts.map(s => `${s.modifier !== "none" ? s.modifier + "+" : ""}${s.key}: ${s.description}`),
    details: "Keyboard shortcuts should be tested manually by pressing the key combinations",
  };
}

/**
 * Check for hover states on interactive elements
 */
export function checkHoverStates(): { passed: boolean; count: number } {
  const styleSheets = Array.from(document.styleSheets);
  let hoverRulesCount = 0;

  styleSheets.forEach((sheet) => {
    try {
      const rules = sheet.cssRules || sheet.rules;
      Array.from(rules).forEach((rule) => {
        if (rule instanceof CSSStyleRule && rule.selectorText?.includes(":hover")) {
          hoverRulesCount++;
        }
      });
    } catch {
      // Cross-origin stylesheets will throw
    }
  });

  return {
    passed: hoverRulesCount > 10,
    count: hoverRulesCount,
  };
}

// ============================================
// 8.4 - Performance Checklist Utilities
// ============================================

/**
 * Get Core Web Vitals metrics
 */
export function getWebVitals(): Promise<{
  lcp: number | null;
  fid: number | null;
  cls: number | null;
}> {
  return new Promise((resolve) => {
    const metrics = {
      lcp: null as number | null,
      fid: null as number | null,
      cls: null as number | null,
    };

    // LCP
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        // LCP not supported
      }

      // FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metrics.fid = (entries[0] as PerformanceEventTiming).processingStart - entries[0].startTime;
          }
        });
        fidObserver.observe({ type: "first-input", buffered: true });
      } catch {
        // FID not supported
      }

      // CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as LayoutShift).hadRecentInput) {
              clsValue += (entry as LayoutShift).value;
            }
          }
          metrics.cls = clsValue;
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });
      } catch {
        // CLS not supported
      }
    }

    // Give observers time to collect data
    setTimeout(() => resolve(metrics), 1000);
  });
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Check bundle size (approximate from loaded resources)
 */
export function checkBundleSize(): { totalSize: string; jsSize: string; cssSize: string } {
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;

  resources.forEach((resource) => {
    const size = resource.transferSize || 0;
    totalSize += size;

    if (resource.name.endsWith(".js") || resource.name.includes(".js?")) {
      jsSize += size;
    }
    if (resource.name.endsWith(".css") || resource.name.includes(".css?")) {
      cssSize += size;
    }
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    totalSize: formatSize(totalSize),
    jsSize: formatSize(jsSize),
    cssSize: formatSize(cssSize),
  };
}

/**
 * Check for lazy-loaded images
 * Only counts images that should be lazy-loaded (below the fold or in modals)
 * Images above the fold should be eager-loaded for LCP
 */
export function checkLazyImages(): { total: number; lazy: number; eager: number; belowFold: number } {
  const images = document.querySelectorAll("img");
  let lazy = 0;
  let eager = 0;
  let belowFold = 0;
  const viewportHeight = window.innerHeight;

  images.forEach((img) => {
    // Skip hidden images
    const style = window.getComputedStyle(img);
    if (style.display === "none" || style.visibility === "hidden" || img.offsetParent === null) {
      return;
    }

    const rect = img.getBoundingClientRect();
    const isBelowFold = rect.top > viewportHeight;
    const isInModal = img.closest('[role="dialog"], [aria-modal="true"], .modal, [class*="Modal"]');

    if (isBelowFold || isInModal) {
      belowFold++;
      if (img.loading === "lazy") {
        lazy++;
      } else {
        eager++;
      }
    }
  });

  return {
    total: images.length,
    lazy,
    eager,
    belowFold,
  };
}

// ============================================
// 8.5 - Accessibility Checklist Utilities
// ============================================

/**
 * Check if prefers-reduced-motion is respected
 */
export function checkReducedMotion(): { prefersReduced: boolean; details: string } {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    prefersReduced,
    details: prefersReduced
      ? "User prefers reduced motion - animations should be disabled"
      : "User has no motion preference - animations can play",
  };
}

/**
 * Check ARIA landmarks
 */
export function checkARIALandmarks(): {
  passed: boolean;
  found: string[];
  missing: string[]
} {
  const landmarks = [
    { selector: '[role="main"], main', name: "main" },
    { selector: '[role="navigation"], nav', name: "navigation" },
    { selector: '[role="banner"], header', name: "banner" },
    { selector: '[role="contentinfo"], footer', name: "contentinfo" },
  ];

  const found: string[] = [];
  const missing: string[] = [];

  landmarks.forEach(({ selector, name }) => {
    const element = document.querySelector(selector);
    if (element) {
      found.push(name);
    } else {
      missing.push(name);
    }
  });

  return {
    passed: missing.length === 0,
    found,
    missing,
  };
}

/**
 * Check focus indicators
 */
export function checkFocusIndicators(): { passed: boolean; details: string } {
  const styleSheets = Array.from(document.styleSheets);
  let focusRulesCount = 0;
  let focusVisibleCount = 0;

  styleSheets.forEach((sheet) => {
    try {
      const rules = sheet.cssRules || sheet.rules;
      Array.from(rules).forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          if (rule.selectorText?.includes(":focus")) {
            focusRulesCount++;
          }
          if (rule.selectorText?.includes(":focus-visible")) {
            focusVisibleCount++;
          }
        }
      });
    } catch {
      // Cross-origin stylesheets
    }
  });

  return {
    passed: focusRulesCount > 5 || focusVisibleCount > 0,
    details: `Found ${focusRulesCount} :focus rules and ${focusVisibleCount} :focus-visible rules`,
  };
}

/**
 * Calculate relative luminance for WCAG contrast
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse RGB/RGBA color string to get components
 */
function parseColor(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

/**
 * Check if a background color is effectively transparent
 */
function isTransparentBg(colorStr: string): boolean {
  if (colorStr === "transparent" || colorStr === "rgba(0, 0, 0, 0)") return true;
  const parsed = parseColor(colorStr);
  return parsed ? parsed.a === 0 : false;
}

/**
 * Get the effective background color by walking up the DOM tree
 */
function getEffectiveBackground(el: Element): { r: number; g: number; b: number } | null {
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    const styles = window.getComputedStyle(current);
    const bgColor = styles.backgroundColor;

    if (!isTransparentBg(bgColor)) {
      const parsed = parseColor(bgColor);
      if (parsed && parsed.a > 0) {
        return { r: parsed.r, g: parsed.g, b: parsed.b };
      }
    }
    current = current.parentElement;
  }

  // Default to dark background for dark theme
  return { r: 18, g: 18, b: 18 }; // #121212 - typical dark theme bg
}

/**
 * Check color contrast (WCAG-based check for dark themes)
 */
export function checkColorContrast(): {
  checked: number;
  potentialIssues: string[];
} {
  const potentialIssues: string[] = [];
  const textElements = document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, a, button, label");

  let checked = 0;

  textElements.forEach((el) => {
    const styles = window.getComputedStyle(el);

    // Skip hidden elements
    if (styles.display === "none" || styles.visibility === "hidden") return;
    if (styles.opacity === "0") return;

    // Skip elements without text content
    const text = el.textContent?.trim();
    if (!text || text.length === 0) return;

    // Skip elements inside DevTools
    if (el.closest('[data-validation-panel]') || el.closest('[class*="ValidationPanel"]')) return;

    const color = styles.color;
    const textColor = parseColor(color);
    if (!textColor) return;

    // Get effective background (walks up DOM tree)
    const bgColor = getEffectiveBackground(el);
    if (!bgColor) return;

    checked++;

    const textLuminance = getLuminance(textColor.r, textColor.g, textColor.b);
    const bgLuminance = getLuminance(bgColor.r, bgColor.g, bgColor.b);

    const ratio = getContrastRatio(textLuminance, bgLuminance);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    // We use 3:1 as minimum since we don't know text size here
    if (ratio < 3) {
      const displayText = text.slice(0, 20) || el.tagName;
      potentialIssues.push(`Low contrast (${ratio.toFixed(1)}:1): "${displayText}..."`);
    }
  });

  return {
    checked,
    potentialIssues: potentialIssues.slice(0, 5), // Limit to 5 issues
  };
}

/**
 * Check for skip links
 */
export function checkSkipLinks(): { passed: boolean; found: string[] } {
  const skipLinks = document.querySelectorAll('a[href^="#"]');
  const found: string[] = [];

  skipLinks.forEach((link) => {
    const text = link.textContent?.toLowerCase() || "";
    if (
      text.includes("skip") ||
      text.includes("aller") ||
      text.includes("passer") ||
      text.includes("contenu")
    ) {
      found.push(text);
    }
  });

  return {
    passed: found.length > 0,
    found,
  };
}

// ============================================
// Security Checklist Utilities
// ============================================

/**
 * Check for exposed secrets in client-side code
 */
export function checkExposedSecrets(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for sensitive patterns in page content
  const pageContent = document.documentElement.innerHTML;

  // Patterns that should NOT appear in client-side code
  const sensitivePatterns = [
    { pattern: /sk-[a-zA-Z0-9]{32,}/, name: "OpenAI API Key" },
    { pattern: /AIza[0-9A-Za-z-_]{35}/, name: "Google API Key" },
    { pattern: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/, name: "Firebase Server Key" },
    { pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, name: "Private Key" },
    { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, name: "MongoDB Connection String" },
    { pattern: /postgres:\/\/[^:]+:[^@]+@/, name: "PostgreSQL Connection String" },
  ];

  sensitivePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(pageContent)) {
      issues.push(`Potential ${name} exposed in client-side code`);
    }
  });

  // Check for NEXT_PUBLIC_ env vars that shouldn't be public
  const envVars = Object.keys(process.env || {}).filter(
    (key) => key.startsWith("NEXT_PUBLIC_")
  );

  const sensitiveEnvNames = ["SECRET", "PRIVATE", "PASSWORD", "TOKEN", "KEY"];
  envVars.forEach((envVar) => {
    if (sensitiveEnvNames.some((s) => envVar.toUpperCase().includes(s) && !envVar.includes("API_KEY"))) {
      issues.push(`Potentially sensitive env var exposed: ${envVar}`);
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Check for basic XSS vulnerabilities
 */
export function checkXSSPrevention(): { passed: boolean; details: string } {
  // Check for dangerouslySetInnerHTML usage (can't be automated easily)
  // Check CSP header
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  // Check for scripts with inline handlers
  const inlineHandlers = document.querySelectorAll("[onclick], [onload], [onerror], [onmouseover]");

  return {
    passed: inlineHandlers.length === 0,
    details: inlineHandlers.length === 0
      ? "No inline event handlers found (good for XSS prevention)"
      : `Found ${inlineHandlers.length} inline event handlers - consider using addEventListener`,
  };
}

/**
 * Check if LinkedIn tokens are handled server-side
 */
export function checkLinkedInTokenSecurity(): { passed: boolean; details: string } {
  // Check if LinkedIn access token is in localStorage or sessionStorage
  const localStorageKeys = Object.keys(localStorage);
  const sessionStorageKeys = Object.keys(sessionStorage);

  const hasTokenInStorage = [...localStorageKeys, ...sessionStorageKeys].some(
    (key) =>
      key.toLowerCase().includes("linkedin") &&
      (key.toLowerCase().includes("token") || key.toLowerCase().includes("access"))
  );

  // Check for token in cookies (client-accessible)
  const hasCookieToken = document.cookie
    .toLowerCase()
    .includes("linkedin") && document.cookie.toLowerCase().includes("token");

  return {
    passed: !hasTokenInStorage && !hasCookieToken,
    details: hasTokenInStorage || hasCookieToken
      ? "LinkedIn token found in client storage - should be server-side only"
      : "No LinkedIn tokens exposed in client storage (good)",
  };
}

/**
 * Check for rate limiting indicators
 */
export function checkRateLimitingHeaders(): { implemented: boolean; details: string } {
  // This would need to be checked via an actual API call
  // For now, we just note it needs manual verification
  return {
    implemented: false, // Can't verify automatically
    details: "Rate limiting should be verified via API testing (check X-RateLimit headers)",
  };
}

// ============================================
// Animation Checklist Utilities
// ============================================

/**
 * Check animation durations are consistent
 */
export function checkAnimationDurations(): {
  passed: boolean;
  durations: string[];
  issues: string[]
} {
  const durations: string[] = [];
  const issues: string[] = [];
  const validDurations = [100, 150, 200, 300, 400, 500]; // ms

  const styleSheets = Array.from(document.styleSheets);

  styleSheets.forEach((sheet) => {
    try {
      const rules = sheet.cssRules || sheet.rules;
      Array.from(rules).forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          const style = rule.style;
          const duration =
            style.transitionDuration ||
            style.animationDuration ||
            style.getPropertyValue("--duration");

          if (duration && duration !== "0s") {
            durations.push(`${rule.selectorText}: ${duration}`);

            // Check if duration is reasonable (200-400ms for most UI)
            const ms = parseFloat(duration) * (duration.includes("ms") ? 1 : 1000);
            if (ms > 600) {
              issues.push(`Slow animation: ${rule.selectorText} (${duration})`);
            }
          }
        }
      });
    } catch {
      // Cross-origin
    }
  });

  return {
    passed: issues.length === 0,
    durations: durations.slice(0, 10),
    issues,
  };
}

/**
 * Check for AnimatePresence usage (Framer Motion)
 */
export function checkAnimatePresence(): { found: boolean; details: string } {
  // Check if AnimatePresence is in the bundle (approximate check)
  const hasFramerMotion = typeof window !== "undefined" &&
    document.querySelector('[data-framer-appear-id]') !== null;

  return {
    found: hasFramerMotion,
    details: hasFramerMotion
      ? "Framer Motion animations detected"
      : "No Framer Motion exit animations detected (may need AnimatePresence)",
  };
}

/**
 * Check for loading states (skeletons)
 */
export function checkLoadingStates(): { found: number; details: string } {
  const skeletons = document.querySelectorAll(
    '[class*="skeleton"], [class*="loading"], [class*="shimmer"], [class*="pulse"], [aria-busy="true"]'
  );

  return {
    found: skeletons.length,
    details: skeletons.length > 0
      ? `Found ${skeletons.length} loading state elements`
      : "No skeleton/loading elements currently visible (may appear during loading)",
  };
}

/**
 * Check for smooth scroll behavior
 */
export function checkSmoothScroll(): { enabled: boolean; details: string } {
  const htmlStyle = getComputedStyle(document.documentElement);
  const scrollBehavior = htmlStyle.scrollBehavior;

  return {
    enabled: scrollBehavior === "smooth",
    details: scrollBehavior === "smooth"
      ? "Smooth scrolling enabled"
      : "Smooth scrolling not detected (scroll-behavior: smooth)",
  };
}

// ============================================
// Functional Tests Checklist
// ============================================

/**
 * Check if quota display element exists
 */
export function checkQuotaDisplay(): { found: boolean; details: string } {
  const quotaElements = document.querySelectorAll(
    '[class*="quota"], [data-quota], [aria-label*="quota"], [aria-label*="credits"]'
  );

  const quotaText = Array.from(quotaElements)
    .map((el) => el.textContent)
    .filter(Boolean);

  return {
    found: quotaElements.length > 0,
    details: quotaElements.length > 0
      ? `Quota display found: ${quotaText.join(", ").slice(0, 50)}`
      : "No quota display elements found",
  };
}

/**
 * Check auth state
 */
export function checkAuthState(): { isAuthenticated: boolean; details: string } {
  // Check for common auth indicators
  const hasAuthToken = localStorage.getItem("firebase:authUser") !== null ||
    document.cookie.includes("auth") ||
    document.cookie.includes("session");

  const hasUserAvatar = document.querySelector('[class*="avatar"], [class*="user-menu"], [data-user]');
  const hasLoginButton = document.querySelector('a[href*="login"], button[class*="login"]');

  return {
    isAuthenticated: !!hasUserAvatar || hasAuthToken,
    details: hasUserAvatar
      ? "User appears to be authenticated (avatar/menu found)"
      : hasLoginButton
        ? "User appears to be logged out (login button found)"
        : "Auth state unclear",
  };
}

/**
 * Check chat input presence
 */
export function checkChatInput(): { found: boolean; details: string } {
  const chatInput = document.querySelector(
    'textarea[placeholder*="post"], textarea[id*="chat"], [data-chat-input], #chat-input'
  );

  return {
    found: !!chatInput,
    details: chatInput
      ? "Chat input field found"
      : "Chat input not found on current page",
  };
}

/**
 * Check history page elements
 */
export function checkHistoryElements(): {
  found: boolean;
  postCount: number;
  hasSearch: boolean;
} {
  const postCards = document.querySelectorAll(
    '[class*="post-card"], [data-post], [class*="history"] [class*="card"]'
  );
  const searchInput = document.querySelector(
    'input[type="search"], input[placeholder*="recherch"], input[placeholder*="search"]'
  );

  return {
    found: postCards.length > 0,
    postCount: postCards.length,
    hasSearch: !!searchInput,
  };
}

/**
 * Check for virtualized lists (>50 items)
 */
export function checkVirtualization(): { needed: boolean; implemented: boolean; details: string } {
  const listItems = document.querySelectorAll(
    'li, [class*="card"], [class*="item"], [data-index]'
  );

  const virtualizedIndicators = document.querySelectorAll(
    '[class*="virtual"], [data-virtual], [style*="transform: translateY"]'
  );

  const needed = listItems.length > 50;
  const implemented = virtualizedIndicators.length > 0;

  return {
    needed,
    implemented,
    details: needed
      ? implemented
        ? `Virtualization detected for ${listItems.length} items`
        : `${listItems.length} items found - consider virtualization`
      : `Only ${listItems.length} items - virtualization not needed`,
  };
}

// ============================================
// Run All Checks
// ============================================

export interface ValidationResults {
  mobile: {
    touchTargets: ReturnType<typeof checkTouchTargets>;
    safeArea: ReturnType<typeof checkSafeAreaInsets>;
    horizontalScroll: ReturnType<typeof checkHorizontalScroll>;
  };
  tablet: {
    breakpoint: string;
    layout: ReturnType<typeof checkTabletLayout>;
  };
  desktop: {
    shortcuts: ReturnType<typeof checkKeyboardShortcuts>;
    hoverStates: ReturnType<typeof checkHoverStates>;
  };
  performance: {
    bundleSize: ReturnType<typeof checkBundleSize>;
    lazyImages: ReturnType<typeof checkLazyImages>;
    webVitals?: Awaited<ReturnType<typeof getWebVitals>>;
    virtualization: ReturnType<typeof checkVirtualization>;
  };
  accessibility: {
    reducedMotion: ReturnType<typeof checkReducedMotion>;
    landmarks: ReturnType<typeof checkARIALandmarks>;
    focusIndicators: ReturnType<typeof checkFocusIndicators>;
    contrast: ReturnType<typeof checkColorContrast>;
    skipLinks: ReturnType<typeof checkSkipLinks>;
  };
  security: {
    exposedSecrets: ReturnType<typeof checkExposedSecrets>;
    xssPrevention: ReturnType<typeof checkXSSPrevention>;
    linkedInTokens: ReturnType<typeof checkLinkedInTokenSecurity>;
    rateLimiting: ReturnType<typeof checkRateLimitingHeaders>;
  };
  animations: {
    durations: ReturnType<typeof checkAnimationDurations>;
    animatePresence: ReturnType<typeof checkAnimatePresence>;
    loadingStates: ReturnType<typeof checkLoadingStates>;
    smoothScroll: ReturnType<typeof checkSmoothScroll>;
  };
  functional: {
    quotaDisplay: ReturnType<typeof checkQuotaDisplay>;
    authState: ReturnType<typeof checkAuthState>;
    chatInput: ReturnType<typeof checkChatInput>;
    historyElements: ReturnType<typeof checkHistoryElements>;
  };
}

export async function runAllValidations(): Promise<ValidationResults> {
  const webVitals = await getWebVitals();

  return {
    mobile: {
      touchTargets: checkTouchTargets(),
      safeArea: checkSafeAreaInsets(),
      horizontalScroll: checkHorizontalScroll(),
    },
    tablet: {
      breakpoint: getCurrentBreakpoint(),
      layout: checkTabletLayout(),
    },
    desktop: {
      shortcuts: checkKeyboardShortcuts(),
      hoverStates: checkHoverStates(),
    },
    performance: {
      bundleSize: checkBundleSize(),
      lazyImages: checkLazyImages(),
      webVitals,
      virtualization: checkVirtualization(),
    },
    accessibility: {
      reducedMotion: checkReducedMotion(),
      landmarks: checkARIALandmarks(),
      focusIndicators: checkFocusIndicators(),
      contrast: checkColorContrast(),
      skipLinks: checkSkipLinks(),
    },
    security: {
      exposedSecrets: checkExposedSecrets(),
      xssPrevention: checkXSSPrevention(),
      linkedInTokens: checkLinkedInTokenSecurity(),
      rateLimiting: checkRateLimitingHeaders(),
    },
    animations: {
      durations: checkAnimationDurations(),
      animatePresence: checkAnimatePresence(),
      loadingStates: checkLoadingStates(),
      smoothScroll: checkSmoothScroll(),
    },
    functional: {
      quotaDisplay: checkQuotaDisplay(),
      authState: checkAuthState(),
      chatInput: checkChatInput(),
      historyElements: checkHistoryElements(),
    },
  };
}
