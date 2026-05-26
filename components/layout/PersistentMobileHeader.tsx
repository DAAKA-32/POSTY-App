"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useLanguage } from "@/contexts/LanguageContext";

// Routes where the mobile header should render — exactly the routes whose
// `page.tsx` wraps in `<MainLayout>`. Outside this list, pages bring their
// own bare layout and we must NOT add an extra header bar.
const APP_ROUTE_PREFIXES = [
  "/app",
  "/history",
  "/schedule",
  "/analytics",
  "/checkout",
] as const;

function isAppRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return APP_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function deriveHeaderTitle(
  pathname: string | null,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  if (!pathname) return "Posty";
  if (pathname.startsWith("/history")) return t.history?.title ?? "Posty";
  if (pathname.startsWith("/schedule")) return t.schedulePage?.headerTitle ?? "Posty";
  if (pathname.startsWith("/analytics") || pathname.startsWith("/dashboard")) return "Analytics";
  if (pathname.startsWith("/checkout/success")) return t.checkoutSuccess?.headerTitle ?? "Posty";
  return "Posty";
}

/**
 * Scroll-aware glass toggle. The mobile header sits ABOVE every MainLayout
 * instance — pages mount and unmount but the header stays. To detect scroll
 * across any container the active page may use (window, the canonical
 * `.mobile-scroll` wrapper, etc.), we listen on the capture phase of
 * `scroll` so we catch events from any descendant scroller without needing
 * to inject a sentinel into each page.
 */
function useAnyScrolledPast(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Reset on every route change — a freshly mounted page starts at scrollTop=0
  useEffect(() => {
    setScrolled(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const compute = (target: EventTarget | Window | Document | null) => {
      const windowTop = window.scrollY ?? 0;
      let containerTop = 0;
      if (target && target !== window && target !== document && target instanceof HTMLElement) {
        containerTop = target.scrollTop;
      }
      const next = Math.max(windowTop, containerTop) > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    };

    const onScroll = (e: Event) => compute(e.target);
    const onWindowScroll = () => compute(window);

    // Capture phase catches scroll events from ANY descendant scroller —
    // critical because mobile pages scroll inside their own container, not
    // the document.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    compute(window);

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, [threshold]);

  return scrolled;
}

/**
 * The mobile top bar that PERSISTS across in-app navigation.
 *
 * Lives in app/layout.tsx (root layout), so its DOM node is created exactly
 * once for the user's session and never gets torn down on route change. This
 * eliminates the "flash square" that used to appear when each page's
 * MainLayout was unmounting/remounting along with its inline `<header>`.
 *
 * Mobile-only (`lg:hidden`). Renders only on authenticated app routes.
 */
export default function PersistentMobileHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { open: openSidebar } = useSidebar();
  const isScrolled = useAnyScrolledPast(8);

  const show = isAppRoute(pathname);
  const title = useMemo(() => deriveHeaderTitle(pathname, t), [pathname, t]);

  if (!show) return null;

  return (
    <header
      role="banner"
      aria-label="En-tête mobile"
      className={`mobile-header lg:hidden fixed top-0 left-0 right-0 z-[60] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out ${
        isScrolled
          ? "backdrop-blur-xl backdrop-saturate-150 bg-white/60 dark:bg-black/40 border-b border-white/30 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]"
          : "bg-transparent border-b border-transparent"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center justify-between h-14 min-h-[56px] px-4">
        <button
          onClick={openSidebar}
          className="min-w-[44px] min-h-[44px] p-2.5 -ml-2 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover rounded-lg transition-colors duration-200"
          aria-label={t.sidebar?.openMenu ?? "Open menu"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-sm" />
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl overflow-hidden shadow-md ring-1 ring-white/50 dark:ring-dark-border/50 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base sm:text-lg tracking-tight truncate max-w-[200px] sm:max-w-none">
            {title}
          </span>
        </div>
        <div className="w-10 flex-shrink-0" />
      </div>
    </header>
  );
}
