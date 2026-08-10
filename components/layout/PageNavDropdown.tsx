"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlanType, meetsMinimumPlan } from "@/lib/config/plans";
import {
  menuContainerVariants,
  menuRowVariants,
  transition,
} from "@/lib/motion";

/**
 * PageNavDropdown — a single, reusable page switcher used at the top of every
 * utility page (Dashboard / Profile / Settings / Subscription) via
 * PageHeader's `title` slot. It shows the CURRENT page as a trigger and, when
 * opened, lets the user jump to any of the burger-menu destinations — Home,
 * Dashboard, Profile, Settings, Subscription — without leaving through the
 * sidebar.
 *
 * Design language is deliberately identical to ProfileMenu (same glass panel,
 * same icon set + identity colors, same Dashboard PRO gating) so the two
 * floating surfaces read as one system. Active page is derived from the
 * router (usePathname) — never a per-page manual flag.
 */

type NavId = "home" | "dashboard" | "profile" | "settings" | "subscription";

interface NavItem {
  id: NavId;
  href: string;
  /** i18n label key under `t.ui`. */
  labelKey: "home" | "dashboardNav" | "profileNav" | "settingsNav" | "subscriptionNav";
  iconColor: string;
  hoverBg: string;
  hoverText: string;
  accentBar: string;
  /** Solid tint used when the row is the active page. */
  activeBg: string;
  activeText: string;
  icon: React.ReactNode;
  requiredPlan?: PlanType;
}

// Order mirrors the burger-menu brief: Home, Dashboard, Profile, Settings,
// Subscription. Icons for dashboard/profile/settings/subscription are the same
// glyphs used in ProfileMenu so the visual vocabulary stays consistent.
const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    href: "/app",
    labelKey: "home",
    iconColor: "text-rose-500",
    hoverBg: "hover:bg-rose-500/[0.08] dark:hover:bg-rose-500/[0.12]",
    hoverText: "hover:text-rose-600 dark:hover:text-rose-400",
    accentBar: "bg-rose-500",
    activeBg: "bg-rose-500/[0.10] dark:bg-rose-500/[0.16]",
    activeText: "text-rose-600 dark:text-rose-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    href: "/dashboard",
    labelKey: "dashboardNav",
    iconColor: "text-emerald-500",
    hoverBg: "hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.12]",
    hoverText: "hover:text-emerald-600 dark:hover:text-emerald-400",
    accentBar: "bg-emerald-500",
    activeBg: "bg-emerald-500/[0.10] dark:bg-emerald-500/[0.16]",
    activeText: "text-emerald-600 dark:text-emerald-400",
    requiredPlan: "pro",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: "profile",
    href: "/profile",
    labelKey: "profileNav",
    iconColor: "text-cyan-500",
    hoverBg: "hover:bg-cyan-500/[0.08] dark:hover:bg-cyan-500/[0.12]",
    hoverText: "hover:text-cyan-600 dark:hover:text-cyan-400",
    accentBar: "bg-cyan-500",
    activeBg: "bg-cyan-500/[0.10] dark:bg-cyan-500/[0.16]",
    activeText: "text-cyan-600 dark:text-cyan-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "settings",
    href: "/settings",
    labelKey: "settingsNav",
    iconColor: "text-violet-500",
    hoverBg: "hover:bg-violet-500/[0.08] dark:hover:bg-violet-500/[0.12]",
    hoverText: "hover:text-violet-600 dark:hover:text-violet-400",
    accentBar: "bg-violet-500",
    activeBg: "bg-violet-500/[0.10] dark:bg-violet-500/[0.16]",
    activeText: "text-violet-600 dark:text-violet-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "subscription",
    href: "/subscription",
    labelKey: "subscriptionNav",
    iconColor: "text-[#F8935D]",
    hoverBg: "hover:bg-[#F8935D]/[0.10] dark:hover:bg-[#F8935D]/[0.14]",
    hoverText: "hover:text-[#F8935D]",
    accentBar: "bg-[#F8935D]",
    activeBg: "bg-[#F8935D]/[0.12] dark:bg-[#F8935D]/[0.16]",
    activeText: "text-[#F8935D]",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

interface PageNavDropdownProps {
  /** Fallback label shown if the current route isn't one of the nav items. */
  fallbackLabel?: string;
}

export default function PageNavDropdown({ fallbackLabel }: PageNavDropdownProps) {
  const { t } = useLanguage();
  const { currentPlan } = useSubscription();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const labels: Record<NavItem["labelKey"], string> = {
    home: t.ui.home,
    dashboardNav: t.ui.dashboardNav,
    profileNav: t.ui.profileNav,
    settingsNav: t.ui.settingsNav,
    subscriptionNav: t.ui.subscriptionNav,
  };

  // Active page = current route. Exact match, or a nested route under it
  // (e.g. /app/c/[id] still counts as Home). Longest href wins so that
  // e.g. /app doesn't shadow a more specific match.
  const activeItem = useMemo(() => {
    const p = pathname || "";
    const matches = NAV_ITEMS.filter(
      (it) => p === it.href || p.startsWith(it.href + "/")
    );
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.href.length - a.href.length)[0];
  }, [pathname]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const triggerLabel = activeItem ? labels[activeItem.labelKey] : (fallbackLabel ?? "");

  return (
    <div ref={rootRef} className="relative inline-flex">
      {/* Trigger — reads as the page title but is actually a switcher. Keeps
          PageHeader's optical weight (text-lg font-semibold) and adds a
          subtle glass hover + the current page's identity-colored icon. */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        whileTap={{ scale: 0.98 }}
        transition={transition.springSnappy}
        className="
          group inline-flex items-center gap-2 rounded-lg px-2.5 py-1
          text-lg font-semibold text-gray-900 dark:text-white
          hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
          transition-colors duration-200
        "
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {activeItem && (
          <span className={`shrink-0 ${activeItem.iconColor}`}>{activeItem.icon}</span>
        )}
        <span className="truncate">{triggerLabel}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={transition.springSnappy}
          className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary transition-colors duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Dropdown — glass panel centered under the (centered) trigger.
          IMPORTANT: the horizontal centering (-translate-x-1/2) lives on this
          NON-animated wrapper, NOT on the motion panel. Framer Motion drives
          the panel's own `transform` (y + scale), which would otherwise clobber
          a Tailwind translate class and shove the menu off-screen on mobile.
          The max-w guard keeps it inside the viewport on small phones. */}
      <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-60 max-w-[calc(100vw-1.5rem)]">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              variants={menuContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: "top center", willChange: "transform, opacity" }}
              className="posty-glass-panel pointer-events-auto w-full overflow-hidden rounded-xl"
              role="menu"
              aria-orientation="vertical"
            >
            <span aria-hidden="true" className="posty-glass-sheen" />
            <span aria-hidden="true" className="posty-glass-wash rounded-xl" />

            <div className="p-1.5">
              {/* The current page is already shown in the trigger, so we omit
                  it from the list — the menu only offers the OTHER
                  destinations. */}
              {NAV_ITEMS.filter((item) => item.id !== activeItem?.id).map((item) => {
                const isLocked =
                  item.requiredPlan &&
                  !meetsMinimumPlan(currentPlan as PlanType, item.requiredPlan);
                const label = labels[item.labelKey];

                return (
                  <motion.div key={item.id} variants={menuRowVariants}>
                    <Link
                      href={isLocked ? "/subscription" : item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        group/item relative
                        flex items-center gap-3 px-3 py-2.5 rounded-lg
                        text-sm transition-colors duration-150
                        ${isLocked
                          ? "text-gray-400 dark:text-gray-500 hover:bg-white/40 dark:hover:bg-white/[0.06]"
                          : `text-gray-900 dark:text-gray-200 ${item.hoverBg} ${item.hoverText}`
                        }
                      `}
                      role="menuitem"
                    >
                      {/* Signature accent rail — reveals on hover (mirrors ProfileMenu). */}
                      <span
                        aria-hidden="true"
                        className={`
                          absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full
                          transition-opacity duration-150 opacity-0 group-hover/item:opacity-70
                          ${isLocked ? "bg-gray-400 dark:bg-gray-500" : item.accentBar}
                        `}
                      />
                      <span
                        className={`
                          transition-colors duration-150
                          ${isLocked ? "text-gray-400 dark:text-gray-500" : item.iconColor}
                        `}
                      >
                        {item.icon}
                      </span>
                      <span className="transition-colors duration-150 flex-1">{label}</span>

                      {/* PRO badge for locked items (e.g. Dashboard on free). */}
                      {isLocked && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-primary/15 to-accent/15 text-primary border border-primary/20 rounded">
                          PRO
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
