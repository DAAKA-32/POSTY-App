"use client";

import { useState, memo, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useVisibilityObserver } from "@/hooks/ui/useVisibilityObserver";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthHeaders } from "@/lib/api/client";
import { PlanType } from "@/lib/config/plans";
import PostInsightsModal from "./PostInsightsModal";
import { generatePostInsights } from "@/lib/services/generateInsights";

// Static variant styles (outside component to avoid re-creation)
const variantStyles = {
  storytelling: {
    icon: "📖",
    label: "Storytelling",
    color: "text-accent",
  },
  business: {
    icon: "💼",
    label: "Business",
    color: "text-primary",
  },
};

/** Format post content — highlight hashtags and mentions in LinkedIn blue */
function formatPostContent(text: string): ReactNode[] {
  return text.split(/(#[\w\u00C0-\u024F]+|@[\w\u00C0-\u024F]+)/g).map((part, i) => {
    if (part.startsWith("#") || part.startsWith("@")) {
      return (
        <span key={i} className="text-[#0A66C2] font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

interface ModernResponseCardProps {
  content: string;
  variant?: "storytelling" | "business";
  timestamp?: Date;
  isStreaming?: boolean;
  userPlan: PlanType | null;
  onPublishToLinkedIn?: (content: string) => void;
  /** Schedule the post; second arg is the optional AI-generated seed comment to pre-fill in the modal. */
  onSchedule?: (content: string, seedCommentText?: string) => void;
  showVariantBadge?: boolean;
  /** When true, actions are always visible. When false, hover (desktop) / scroll (mobile). */
  isLastMessage?: boolean;
  /** Auto-generated first-comment for this post (algo boost) */
  seedComment?: {
    text?: string;
    loading?: boolean;
    error?: string;
  };
  /** Callback invoked when the user clicks "Regenerate" on the seed comment */
  onRegenerateSeedComment?: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
  transformOrigin: string;
  placement: "bottom" | "top";
}

/**
 * ModernResponseCard - ChatGPT-like response display
 *
 * Design principles:
 * - No border, no background block - direct on conversation background
 * - Clean, minimal, professional
 * - Actions visible but not intrusive
 * - Variant badge only shown for PRO/MAX plans
 */
export const ModernResponseCard = memo(function ModernResponseCard({
  content,
  variant = "business",
  timestamp,
  isStreaming = false,
  userPlan,
  onPublishToLinkedIn,
  onSchedule,
  showVariantBadge = false,
  isLastMessage = true,
  seedComment,
  onRegenerateSeedComment,
}: ModernResponseCardProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { canSchedulePosts } = useSubscription();
  const { userProfile } = useAuth();
  const { t } = useLanguage();
  const canSchedule = canSchedulePosts().allowed;

  // Mobile detection for scroll-based visibility
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // IntersectionObserver for mobile scroll-based action visibility
  const { ref: visibilityRef, isVisible: isInViewport } = useVisibilityObserver({
    threshold: 0.4,
    enabled: isMobile && !isLastMessage,
  });

  // Should actions be visible right now?
  const actionsVisible = isLastMessage || (isMobile ? isInViewport : false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerHaptic("error");
    }
  };

  // Seed comment — primary source is the `seedComment` prop (driven by the
  // parent useChat hook on fresh generations). For posts loaded from history
  // or after a refresh, the parent prop is undefined: we fall back to a local
  // state + on-demand fetch so the user can still generate one with a click.
  const [seedCopied, setSeedCopied] = useState(false);
  const [localSeed, setLocalSeed] = useState<{
    text?: string;
    loading?: boolean;
    error?: string;
  } | null>(null);

  const effectiveSeed = seedComment ?? localSeed ?? undefined;

  const fetchLocalSeedComment = useCallback(async () => {
    if (!content || content.trim().length < 20) return;
    setLocalSeed({ loading: true });
    try {
      const lang = (typeof window !== "undefined"
        ? (localStorage.getItem("posty-language") || "fr")
        : "fr") as "fr" | "en";
      const headers = await getAuthHeaders();
      const res = await fetch("/api/chat/seed-comment", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ postContent: content, language: lang }),
      });
      if (!res.ok) {
        let msg = `Seed comment failed (${res.status})`;
        try {
          const j = await res.json();
          msg = j.message || j.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const data: { comment?: string } = await res.json();
      if (!data.comment) throw new Error("Empty seed comment");
      setLocalSeed({ text: data.comment, loading: false });
    } catch (err) {
      setLocalSeed({
        loading: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }, [content]);

  const handleRegenerate = useCallback(() => {
    // Parent handler wins (keeps `responses[]` in sync); fallback to local.
    if (onRegenerateSeedComment) {
      onRegenerateSeedComment();
    } else {
      void fetchLocalSeedComment();
    }
  }, [onRegenerateSeedComment, fetchLocalSeedComment]);

  const handleCopySeed = async () => {
    if (!effectiveSeed?.text) return;
    try {
      await navigator.clipboard.writeText(effectiveSeed.text);
      setSeedCopied(true);
      triggerHaptic("success");
      setTimeout(() => setSeedCopied(false), 2000);
    } catch {
      triggerHaptic("error");
    }
  };

  // Menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    transformOrigin: "top right",
    placement: "bottom",
  });
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Insights modal state
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Check if mounted for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate menu position dynamically
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuWidth = 180;
    const menuHeight = onSchedule ? 96 : 48; // Height based on number of items (2 or 1)
    const padding = 12;

    let top: number;
    let left: number;
    let transformOrigin: string;
    let placement: "bottom" | "top";

    // Calculate horizontal position - align right edge of menu with button
    left = buttonRect.right - menuWidth;

    // If menu would go off-screen left, align left edges instead
    if (left < padding) {
      left = buttonRect.left;
      transformOrigin = "top left";
    } else {
      transformOrigin = "top right";
    }

    // If menu would go off-screen right, clamp it
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }

    // Calculate vertical position - check available space
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow >= menuHeight + padding || spaceBelow >= spaceAbove) {
      // Show below
      top = buttonRect.bottom + 4;
      placement = "bottom";
    } else {
      // Show above
      top = buttonRect.top - menuHeight - 4;
      placement = "top";
      transformOrigin = transformOrigin.replace("top", "bottom");
    }

    // Ensure menu stays within viewport vertically
    if (top < padding) {
      top = padding;
    } else if (top + menuHeight > viewportHeight - padding) {
      top = viewportHeight - menuHeight - padding;
    }

    setMenuPosition({ top, left, transformOrigin, placement });
  }, [onSchedule]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      // Delay adding listener to avoid capturing the opening click
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Recalculate position on scroll or resize while menu is open
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleUpdate = () => calculatePosition();

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isMenuOpen, calculatePosition]);

  const currentVariant = variantStyles[variant];

  const handlePublish = () => {
    triggerHaptic("light");
    onPublishToLinkedIn?.(content);
  };

  const handleSchedule = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    onSchedule?.(content, seedComment?.text);
  };

  // Lazy insights — only generated on click
  const [insights, setInsights] = useState<ReturnType<typeof generatePostInsights> | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const handleInsights = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    setInsightsLoading(true);
    setIsInsightsOpen(true);
    // Defer computation to next frame so the modal + loader render first
    requestAnimationFrame(() => {
      const result = generatePostInsights(content, variant, userProfile);
      setInsights(result);
      setInsightsLoading(false);
    });
  };

  const toggleMenu = () => {
    if (!isMenuOpen) {
      calculatePosition();
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
    triggerHaptic("light");
  };

  // Render menu in portal with intelligent positioning
  const renderMenu = () => {
    if (!isMounted) return null;

    return createPortal(
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Invisible backdrop for tap-to-close */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu - rendered at body level with intelligent positioning */}
            <motion.div
              ref={menuRef}
              initial={{
                opacity: 0,
                scale: 0.95,
                y: menuPosition.placement === "bottom" ? -8 : 8
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: menuPosition.placement === "bottom" ? -8 : 8
              }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                transformOrigin: menuPosition.transformOrigin,
                zIndex: 9999,
              }}
              className="
                min-w-[180px]
                bg-white dark:bg-dark-card
                border border-border-primary
                rounded-lg shadow-xl
                overflow-hidden
                backdrop-blur-xl
              "
              role="menu"
              aria-orientation="vertical"
            >
              {/* Schedule option - AMBER color (planning/tips) */}
              {onSchedule && (
                <motion.button
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  whileHover={canSchedule ? { x: 2 } : {}}
                  className={`
                    group/schedule w-full flex items-center gap-2.5 px-3 py-2.5
                    text-xs font-medium text-left
                    transition-all duration-150 min-h-[44px]
                    ${canSchedule
                      ? "text-primary hover:bg-[#F8935D]/5 dark:hover:bg-primary/10 active:scale-[0.98]"
                      : "text-text-muted cursor-not-allowed opacity-60"
                    }
                  `}
                  title={canSchedule ? t.ui.schedule : undefined}
                  role="menuitem"
                >
                  <svg className={`w-4 h-4 shrink-0 transition-transform ${canSchedule ? "group-hover/schedule:scale-110" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1">{t.ui.schedule}</span>
                  {!canSchedule && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-primary to-accent text-white rounded">
                      PRO
                    </span>
                  )}
                </motion.button>
              )}

              {/* Insights option - brand primary */}
              <motion.button
                onClick={handleInsights}
                whileHover={{ x: 2 }}
                className="
                  group/insights w-full flex items-center gap-2.5 px-3 py-2.5
                  text-xs font-medium text-left
                  text-primary
                  hover:bg-[#F8935D]/5 dark:hover:bg-primary/10
                  transition-all duration-150 min-h-[44px]
                  active:scale-[0.98]
                "
                title={t.ui.viewStats}
                role="menuitem"
              >
                <svg className="w-4 h-4 shrink-0 group-hover/insights:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1">Insights</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <div ref={visibilityRef} className="w-full max-w-3xl group/card">
      {/* Optional variant badge - only for PRO/MAX when explicitly enabled */}
      {showVariantBadge && !!userPlan && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 mb-2 text-xs font-medium text-text-secondary"
        >
          <span>{currentVariant.icon}</span>
          <span>{currentVariant.label}</span>
        </motion.div>
      )}

      {/* LinkedIn Preview Card */}
      <div className="mb-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border/50 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border/30 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          <span className="text-xs font-medium text-gray-500 dark:text-text-muted">{t.ui.linkedInPreview}</span>
        </div>

        {/* Author info */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-elevated dark:to-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
              {userProfile?.photoURL ? (
                <Image src={userProfile.photoURL} alt="" width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-gray-500 dark:text-text-muted">
                  {(userProfile?.displayName || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-text-primary text-sm leading-tight">
                {userProfile?.displayName || t.ui.you}
              </p>
              <p className="text-xs text-gray-500 dark:text-text-muted truncate">
                {userProfile?.profile?.role || t.ui.yourProfessionalTitle}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-text-muted/60 mt-0.5">
                {t.ui.justNow} · <svg className="w-3 h-3 inline-block -mt-px" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.668 2.628L8.464 5.836a.5.5 0 01-.464.164H4a.5.5 0 000 1h4a.5.5 0 00.464-.336l3.204-3.204a6.966 6.966 0 010 9.08L8.464 9.336A.5.5 0 008 9.5H4a.5.5 0 000 1h4a.5.5 0 00.354-.146l3.314-3.314a6.966 6.966 0 010-4.412z" /><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4v4l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </p>
            </div>
          </div>
        </div>

        {/* Post content — the user's deliverable. Browser auto-translation
            would corrupt the exact text about to be published to LinkedIn. */}
        <div className="px-4 pb-3">
          <div
            className="notranslate whitespace-pre-wrap break-words overflow-wrap-anywhere text-[14px] leading-relaxed text-gray-900 dark:text-text-primary"
            translate="no"
          >
            {formatPostContent(content)}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
              />
            )}
          </div>
        </div>

        {/* Seed comment — minimalist inline block under the post.
            Single thin left border, tiny label, no decorative gradient.
            States: idle (Generate link) / loading (1 shimmer line) /
            text (read + tiny actions) / error (text + retry link). */}
        {!isStreaming && content && (
          <div className="mx-4 mb-3 pl-3 border-l-2 border-[#F8935D]/40 dark:border-[#F8935D]/50">
            {effectiveSeed?.loading ? (
              <motion.div
                className="h-2 rounded-full bg-gray-200 dark:bg-dark-border/60"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "75%" }}
              />
            ) : effectiveSeed?.error ? (
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-gray-500 dark:text-text-muted">
                  Erreur de génération.
                </span>
                <button
                  onClick={handleRegenerate}
                  className="text-[11.5px] font-medium text-[#F8935D] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : effectiveSeed?.text ? (
              <div className="group/seed">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-text-muted/70 font-medium">
                    1er commentaire
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/seed:opacity-100 transition-opacity">
                    <button
                      onClick={handleRegenerate}
                      className="p-1 rounded text-gray-400 hover:text-[#F8935D] transition-colors"
                      aria-label="Régénérer"
                      title="Régénérer"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCopySeed}
                      className="p-1 rounded text-gray-400 hover:text-[#F8935D] transition-colors"
                      aria-label={t.ui.copy}
                      title={t.ui.copy}
                    >
                      {seedCopied ? (
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[13px] leading-relaxed text-gray-700 dark:text-text-primary/90 whitespace-pre-wrap break-words"
                >
                  {effectiveSeed.text}
                </motion.p>
              </div>
            ) : (
              /* Idle — single line link, no fanfare. */
              <button
                onClick={handleRegenerate}
                className="
                  inline-flex items-center gap-1.5
                  text-[12px] font-medium
                  text-[#F8935D] hover:text-[#F76B54]
                  transition-colors duration-150
                "
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un 1er commentaire (boost algo)
              </button>
            )}
          </div>
        )}

        {/* Engagement footer + Action buttons */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border/30">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-text-muted">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center text-[9px]">👍</span>
                <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[9px]">❤️</span>
                <span className="w-[18px] h-[18px] rounded-full bg-yellow-500 flex items-center justify-center text-[9px]">💡</span>
              </div>
              <span className="ml-1 text-gray-400 dark:text-text-muted/70">{t.ui.previewLabel}</span>
            </div>

            {/* Action buttons — inside the card, bottom right */}
            {!isStreaming && content && (
              <div
                className={`
                  flex items-center gap-1.5
                  transition-all duration-200 ease-out
                  ${isLastMessage
                    ? "opacity-100"
                    : isMobile
                      ? (actionsVisible ? "opacity-100" : "opacity-0 pointer-events-none")
                      : "opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto"
                  }
                `}
              >
          {/* Copy button */}
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="
              group/copy relative overflow-hidden
              inline-flex items-center justify-center
              w-7 h-7 rounded-md
              bg-gray-100 dark:bg-dark-elevated
              hover:bg-gray-200 dark:hover:bg-dark-hover
              border border-gray-200 dark:border-dark-border
              hover:border-primary/30
              transition-all duration-200
            "
            aria-label={t.ui.copyMessage}
            title={t.ui.copy}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.svg
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-3.5 h-3.5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-3.5 h-3.5 text-text-muted group-hover/copy:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Publish to LinkedIn */}
          {onPublishToLinkedIn && (
            <motion.button
              onClick={handlePublish}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                group/btn relative overflow-hidden
                inline-flex items-center gap-1 px-2.5 py-1
                text-[11px] font-medium rounded-md
                bg-[#0A66C2]/10 text-[#0A66C2]
                hover:bg-[#0A66C2]/20
                transition-all duration-200
                border border-[#0A66C2]/20
              "
            >
              <LinkedInIcon className="w-3 h-3 relative z-10" />
              <span className="relative z-10 hidden sm:inline">{t.ui.publish}</span>
            </motion.button>
          )}

          {/* More actions button */}
          <motion.button
            ref={triggerRef}
            onClick={toggleMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              group/more relative overflow-hidden
              inline-flex items-center justify-center
              w-7 h-7 rounded-md
              bg-gradient-to-br from-primary/10 to-primary-hover/10
              hover:from-primary/20 hover:to-primary-hover/20
              border border-primary/20
              transition-all duration-200
              ${isMenuOpen ? "from-primary/20 to-primary-hover/20 shadow-[0_0_12px_rgba(248,147,93,0.3)]" : ""}
            `}
            aria-label={t.ui.moreActions}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            title={t.ui.moreActions}
          >
            <svg
              className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${isMenuOpen ? "rotate-45" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>

          {renderMenu()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Modal — lazy loaded */}
      <PostInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        insights={insights}
        isLoading={insightsLoading}
      />
    </div>
  );
});

export default ModernResponseCard;
