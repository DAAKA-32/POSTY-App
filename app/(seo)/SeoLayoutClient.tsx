"use client";

import { useEffect, ReactNode } from "react";
import dynamic from "next/dynamic";

const LandingNavbar = dynamic(() => import("@/components/layout/LandingNavbar"), { ssr: false });

/**
 * Client wrapper for SEO pages — forces native body scroll + light theme.
 *
 * NUCLEAR approach: strips ALL scroll-blocking CSS/classes/styles from html,
 * body, and every ancestor of the page content. Also adds a direct wheel
 * event forwarder as a last-resort safety net.
 */
export default function SeoLayoutClient({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // ── Light theme ──
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");

    // ── Remove ALL classes that could block scroll ──
    const blocking = [
      "pwa-mobile", "no-scroll", "scroll-locked", "modal-open",
      "bottomsheet-open", "no-bounce", "page-fixed", "landing-no-scroll",
      "touch-fixed", "no-pull-refresh",
    ];
    blocking.forEach((cls) => {
      root.classList.remove(cls);
      body.classList.remove(cls);
    });

    // ── Add whitelist class ──
    root.classList.add("seo-scroll-enabled");
    body.classList.add("seo-scroll-enabled");

    // ── Remove the MobileGestureProvider injected style tag ──
    const gestureBlocker = document.getElementById("posty-gesture-blocker");
    if (gestureBlocker) gestureBlocker.remove();

    // ── NUCLEAR: Remove ALL inline styles from html and body, then re-apply only what we need ──
    root.removeAttribute("style");
    body.removeAttribute("style");

    // Re-apply only light theme color scheme
    root.style.colorScheme = "light";

    // ── NUCLEAR: Inject a dedicated <style> tag with highest-specificity rules ──
    const styleId = "seo-scroll-fix";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      /* SEO SCROLL FIX — injected by SeoLayoutClient */
      html.seo-scroll-enabled {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        position: static !important;
        height: auto !important;
        min-height: 100vh !important;
        width: 100% !important;
        touch-action: auto !important;
        pointer-events: auto !important;
        overscroll-behavior: auto !important;
      }
      html.seo-scroll-enabled body {
        overflow: visible !important;
        overflow-x: hidden !important;
        overflow-y: visible !important;
        position: static !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        width: 100% !important;
        touch-action: auto !important;
        pointer-events: auto !important;
        overscroll-behavior: auto !important;
      }
      /* Kill ALL scroll traps in descendants (exclude replaced elements to avoid browser warning) */
      html.seo-scroll-enabled body *:not(img):not(video):not(canvas):not(svg):not(iframe) {
        overflow-y: visible !important;
        max-height: none !important;
      }
      /* Preserve overflow-x clip/hidden for layout */
      html.seo-scroll-enabled body [class*="overflow-hidden"],
      html.seo-scroll-enabled body [class*="overflow-x"] {
        overflow-x: clip !important;
        overflow-y: visible !important;
      }
      /* Preserve fixed navbar positioning but ensure pointer passthrough */
      html.seo-scroll-enabled .fixed:not(nav):not([class*="navbar"]):not([class*="Navbar"]):not(button):not(a) {
        pointer-events: none !important;
      }
      /* But allow clicks on navbar and its children */
      html.seo-scroll-enabled nav,
      html.seo-scroll-enabled nav * {
        pointer-events: auto !important;
      }
      /* Toaster: always pass through */
      html.seo-scroll-enabled [data-rht-toaster] {
        pointer-events: none !important;
      }
    `;

    // ── Guard: periodically re-clean ──
    const guardInterval = setInterval(() => {
      blocking.forEach((cls) => {
        root.classList.remove(cls);
        body.classList.remove(cls);
      });
      if (!root.classList.contains("seo-scroll-enabled")) root.classList.add("seo-scroll-enabled");
      if (!body.classList.contains("seo-scroll-enabled")) body.classList.add("seo-scroll-enabled");

      // Re-remove gesture blocker if it was re-injected
      const gb = document.getElementById("posty-gesture-blocker");
      if (gb) gb.remove();

      // Re-remove any inline styles that crept back onto html/body
      // (except colorScheme which we need)
      const rootStyle = root.getAttribute("style") || "";
      if (rootStyle && !rootStyle.includes("color-scheme") && rootStyle.length > 0) {
        root.removeAttribute("style");
        root.style.colorScheme = "light";
      }
    }, 300);

    // ── MutationObserver ──
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "attributes") continue;
        const el = m.target as HTMLElement;
        if (m.attributeName === "class") {
          for (const cls of blocking) {
            if (el.classList.contains(cls)) el.classList.remove(cls);
          }
          if (!el.classList.contains("seo-scroll-enabled")) el.classList.add("seo-scroll-enabled");
        }
        if (m.attributeName === "style" && (el === root || el === body)) {
          // If someone re-adds scroll-blocking inline styles, strip them
          if (el === body) {
            const overflow = el.style.getPropertyValue("overflow-y");
            if (overflow && overflow !== "visible") {
              el.style.setProperty("overflow-y", "visible", "important");
            }
            const pos = el.style.getPropertyValue("position");
            if (pos && pos !== "static") {
              el.style.setProperty("position", "static", "important");
            }
          }
        }
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    observer.observe(body, { attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      clearInterval(guardInterval);
      observer.disconnect();
      root.classList.remove("seo-scroll-enabled");
      body.classList.remove("seo-scroll-enabled");
      const fixStyle = document.getElementById(styleId);
      if (fixStyle) fixStyle.remove();
    };
  }, []);

  return (
    <>
      <LandingNavbar />
      {children}
    </>
  );
}
