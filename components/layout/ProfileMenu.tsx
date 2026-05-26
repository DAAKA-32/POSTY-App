"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlanBadge } from "@/components/subscription/PlanInfoCard";
import { PlanType, meetsMinimumPlan } from "@/lib/config/plans";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import {
  menuContainerVariants,
  menuRowVariants,
  transition,
} from "@/lib/motion";

interface ProfileMenuProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

const menuItems: {
  id: string;
  href: string;
  iconColor: string;
  /** Hover surface tint — kept very low alpha so it reads as a glass wash,
      not a colored chip — and lets the page-tone ambient still come through. */
  hoverBg: string;
  hoverText: string;
  /** 2-px signature accent rail (left edge) on hover/focus. Matches the
      item's identity color; same pattern as ConversationOptionsMenu. */
  accentBar: string;
  icon: React.ReactNode;
  requiredPlan?: PlanType;
}[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    iconColor: "text-emerald-500",
    hoverBg: "hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.12]",
    hoverText: "hover:text-emerald-600 dark:hover:text-emerald-400",
    accentBar: "bg-emerald-500",
    requiredPlan: "pro",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: "profile",
    href: "/profile",
    iconColor: "text-cyan-500",
    hoverBg: "hover:bg-cyan-500/[0.08] dark:hover:bg-cyan-500/[0.12]",
    hoverText: "hover:text-cyan-600 dark:hover:text-cyan-400",
    accentBar: "bg-cyan-500",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    id: "subscription",
    href: "/subscription",
    iconColor: "text-[#F8935D]",
    hoverBg: "hover:bg-[#F8935D]/[0.10] dark:hover:bg-[#F8935D]/[0.14]",
    hoverText: "hover:text-[#F8935D]",
    accentBar: "bg-[#F8935D]",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    id: "settings",
    href: "/settings",
    iconColor: "text-violet-500",
    hoverBg: "hover:bg-violet-500/[0.08] dark:hover:bg-violet-500/[0.12]",
    hoverText: "hover:text-violet-600 dark:hover:text-violet-400",
    accentBar: "bg-violet-500",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export default function ProfileMenu({ isCollapsed = false, onNavigate }: ProfileMenuProps) {
  const { t } = useLanguage();
  const { user, userProfile } = useAuth();
  const { planConfig, isTestMode, currentPlan } = useSubscription();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuItemNames: Record<string, string> = {
    dashboard: t.ui.dashboardNav,
    profile: t.ui.profileNav,
    subscription: t.ui.subscriptionNav,
    settings: t.ui.settingsNav,
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className={`
          flex items-center justify-center gap-2 px-4 py-3
          bg-gradient-to-r from-primary to-primary-hover
          hover:from-primary-hover hover:to-primary
          text-white font-medium rounded-lg
          transition-all duration-200 shadow-glow hover:shadow-lg
          ${isCollapsed ? "w-full" : ""}
        `}
      >
        {isCollapsed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        ) : (
          t.ui.signIn
        )}
      </Link>
    );
  }

  return (
    <div className="relative">
      {/* Profile Button — fully transparent at all states (rest / hover /
          open). No bg fill, no border, no shadow — so the sidebar's own
          gradient ambient flows through unbroken. Feedback comes purely
          from chevron rotation + tap scale. */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.985 }}
        transition={transition.springSettle}
        className={`
          flex items-center gap-3 p-2 rounded-lg w-full
          bg-transparent transition-colors duration-200 group
          ${isCollapsed ? "justify-center" : ""}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <motion.span
          animate={{ scale: isOpen ? 1.06 : 1 }}
          whileHover={{ scale: 1.06 }}
          transition={transition.springSettle}
          className="inline-flex"
        >
          <ProfileAvatar
            size="sm"
            className={`
              !rounded-full
              border transition-colors duration-200
              ${isOpen ? "border-primary/30" : "border-gray-200 dark:border-dark-border group-hover:border-primary/30"}
            `}
          />
        </motion.span>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-text-primary truncate notranslate" translate="no">
                  {userProfile?.displayName || t.ui.userProfile}
                </p>
                {/* Plan badge */}
                <PlanBadge />
              </div>
              {userProfile?.profile?.role ? (
                <p className="text-xs text-accent truncate">{userProfile.profile.role}</p>
              ) : (
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              )}
            </div>
            {/* Chevron indicator — spring rotation, no abrupt flip. */}
            <div className="shrink-0 w-6 h-6 flex items-center justify-center">
              <motion.svg
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={transition.springSnappy}
                className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </div>
          </>
        )}
      </motion.button>

      {/* Dropdown Menu — glass surface via shared .posty-glass-panel token,
          staggered children via motion tokens. Identical chrome to
          ConversationOptionsMenu so every floating surface in Posty reads as
          one continuous design language. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            variants={menuContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              transformOrigin: isCollapsed ? "left bottom" : "bottom left",
              willChange: "transform, opacity",
              // Inline positioning bypasses any Tailwind class purge or
              // CSS-override surprise. The menu always opens ABOVE the
              // profile button (its trigger sits at the bottom of the
              // sidebar — opening downward would push the menu off-screen).
              position: "absolute",
              ...(isCollapsed
                ? { left: "100%", marginLeft: "0.5rem", bottom: 0 }
                : { bottom: "100%", left: 0, marginBottom: "0.5rem" }),
            }}
            className="posty-glass-panel z-50 w-56 overflow-hidden rounded-xl"
            role="menu"
            aria-orientation="vertical"
          >
            <span aria-hidden="true" className="posty-glass-sheen" />
            <span aria-hidden="true" className="posty-glass-wash rounded-xl" />

            {/* User info header — soft inner divider, not a hard border. */}
            <motion.div
              variants={menuRowVariants}
              className="px-4 py-3 border-b border-white/40 dark:border-white/10"
            >
              <p className="text-sm font-semibold text-text-primary truncate notranslate" translate="no">
                {userProfile?.displayName || t.ui.userProfile}
              </p>
              <p className="text-xs text-text-muted truncate notranslate" translate="no">{user.email}</p>
            </motion.div>

            {/* Menu items */}
            <div className="p-1.5">
              {menuItems.map((item) => {
                const isLocked = item.requiredPlan && !meetsMinimumPlan(currentPlan as PlanType, item.requiredPlan);

                return (
                  <motion.div key={item.id} variants={menuRowVariants}>
                    <Link
                      href={isLocked ? "/subscription" : item.id === "settings" ? `/settings?from=${encodeURIComponent(pathname)}` : item.href}
                      onClick={handleItemClick}
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
                      {/* Signature accent rail — 2px on the left edge, reveals
                          on hover. Same pattern as ConversationOptionsMenu;
                          color matches the item's identity. */}
                      <span
                        aria-hidden="true"
                        className={`
                          absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full
                          transition-opacity duration-150
                          opacity-0 group-hover/item:opacity-70
                          ${isLocked ? "bg-gray-400 dark:bg-gray-500" : item.accentBar}
                        `}
                      />
                      {/* Colored icon */}
                      <span
                        className={`
                          transition-colors duration-150
                          ${isLocked ? "text-gray-400 dark:text-gray-500" : item.iconColor}
                        `}
                      >
                        {item.icon}
                      </span>
                      <span className="font-medium transition-colors duration-150 flex-1">{menuItemNames[item.id]}</span>
                      {/* PRO badge for locked items */}
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

            {/* Arrow indicator for collapsed mode — same glass surface as the
                panel so the seam reads as one continuous piece of glass. */}
            {isCollapsed && (
              <div className="posty-glass-panel absolute -left-1.5 bottom-4 w-3 h-3 rotate-45" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip for collapsed mode (only when menu is closed) — shares the
          same glass token; lighter blur (sized via its own class) keeps it
          feeling secondary. */}
      {isCollapsed && !isOpen && (
        <div className="
          posty-glass-panel
          absolute left-full ml-2 bottom-0 rounded-lg
          px-3 py-2 text-sm whitespace-nowrap
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-opacity duration-200 z-40
          pointer-events-none
        ">
          <p className="font-semibold text-gray-900 dark:text-text-primary notranslate" translate="no">{userProfile?.displayName || t.ui.userProfile}</p>
          <p className="text-xs text-gray-500 dark:text-text-muted notranslate" translate="no">{user.email}</p>
          <div className="posty-glass-panel absolute -left-1 bottom-3 w-2 h-2 rotate-45" />
        </div>
      )}
    </div>
  );
}
