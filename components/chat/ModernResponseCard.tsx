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

/**
 * Variant payload threaded from the page to the LinkedIn preview. The card
 * doesn't own the entry — it just renders what the parent passes. Selection
 * lives in the parent so the publish flow can pick the right URL without
 * cross-component refs.
 *
 * Mirrors the standalone `<GeneratedImageVariants>` card so a user gets the
 * SAME picker UX whether they typed "fais-moi des images" (standalone) or
 * clicked "Ajouter des visuels" / hit the intent=both path (embedded).
 */
export interface AttachedVisual {
  /** All rendered variants — usually 3 on Pro/Max. Keep ordered as the
   *  server returned them so thumb positions stay stable across re-renders. */
  variants: Array<{ url: string; imageId: string; alt?: string }>;
  /** Indices of variants picked for publishing, in click order. Empty array
   *  = "publish without any visual". Length 0..variants.length. The publish
   *  flow forwards `selectedIndices.map(i => variants[i].url)` to LinkedIn. */
  selectedIndices: number[];
  /** Toggle a variant in/out of the selection. First click adds it at the
   *  next publish position; click on an already-selected variant removes it. */
  onToggle: (index: number) => void;
  /** Optional — regenerate the whole set of variants in place. */
  onRegenerate?: () => void;
  /** True while a regenerate request is in flight (spinner overlay on hero). */
  isRegenerating?: boolean;
  /** False when the user has hit their daily image quota — hides the
   *  regenerate icon since clicking would just fail with a toast. */
  canRegenerate?: boolean;
}

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
  /**
   * Visual(s) paired with this post — rendered as a media attachment inside
   * the preview card. Carries ALL generated variants + the user's multi-
   * selection so the publish flow can ship 1..N visuals. The hero block
   * adapts its layout to the count of picked variants (single hero / split
   * pair / mosaic of three).
   *
   * The hero block is capped to `max-w-md mx-auto` so the embedded preview
   * lands at ~448px wide — the exact rhythm as the standalone
   * <GeneratedImageVariants> card. Both flows produce the same picker UX
   * as a result.
   */
  attachedVisual?: AttachedVisual | null;
  /** @deprecated Pass `attachedVisual` instead. Kept as a thin alias so
   *  legacy single-image call-sites (loaded from older Firestore records
   *  without variants[]) still render. Maps to a 1-variant attachedVisual. */
  attachedImage?: { url: string; alt?: string } | null;
  /**
   * True when this post is part of an intent=both run and the paired visual
   * is still rendering. We show a shimmer placeholder in the attached-image
   * slot so the user sees that an image IS coming for this post, without
   * having to scroll to a separate "generating visual" entry.
   */
  attachedImageLoading?: boolean;
  /**
   * Optional shortcut surfaced on the LAST post bubble when it has no visual
   * attached yet. Lets the user fire the image pipeline against this post's
   * text in one click — no need to retype "ajoute des visuels", no risk of
   * the intent classifier hedging. Hidden when an image is already attached
   * or currently rendering (would be redundant).
   */
  onAddVisual?: (postContent: string, variantCount: 1 | 2 | 3) => void;
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
  attachedVisual = null,
  attachedImage = null,
  attachedImageLoading = false,
  onAddVisual,
}: ModernResponseCardProps) {
  // Unify both prop shapes — `attachedVisual` is the new canonical payload,
  // `attachedImage` is the legacy single-URL fallback. Downstream rendering
  // only ever sees a normalized AttachedVisual (or null).
  const effectiveVisual: AttachedVisual | null = attachedVisual
    ? attachedVisual
    : attachedImage
      ? {
          variants: [{ url: attachedImage.url, imageId: "legacy", alt: attachedImage.alt }],
          selectedIndices: [0],
          onToggle: () => {},
        }
      : null;
  // Clamp to valid indices so a stale selection (e.g. after a regen that
  // shrank the variants list) doesn't crash the hero grid.
  const safeSelectedIndices = effectiveVisual
    ? effectiveVisual.selectedIndices.filter(
        (i) => i >= 0 && i < effectiveVisual.variants.length
      )
    : [];
  const selectedVariants = effectiveVisual
    ? safeSelectedIndices.map((i) => effectiveVisual.variants[i])
    : [];
  // When the user has deselected everything, fall back to variants[0] as the
  // hero so the preview never collapses to an empty space. Publish still
  // ships zero images (selectedIndices is empty).
  const heroVariant = effectiveVisual
    ? selectedVariants[0] ?? effectiveVisual.variants[0]
    : null;
  const hasMultipleVariants = (effectiveVisual?.variants.length ?? 0) > 1;
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

        {/* Visual-still-generating skeleton — capped to the same max-w-md
            rhythm as the final hero so layout doesn't snap when the image
            lands. A short shimmer band; the full hero reveals on resolve. */}
        {!effectiveVisual && attachedImageLoading && (
          <div className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-dark-border/30">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="
                relative max-w-md mx-auto w-full aspect-square overflow-hidden
                rounded-xl
                bg-gradient-to-br from-gray-100 to-gray-200
                dark:from-dark-elevated dark:to-dark-border
                border border-gray-200 dark:border-dark-border
              "
              aria-label="Visuel en cours de génération"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] uppercase tracking-wider text-text-secondary/80 font-medium">
                  Visuel en cours…
                </span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Attached visual(s) — LinkedIn-style media attachment, capped to
            max-w-md (~448px) so it matches the standalone <GeneratedImageVariants>
            card. The hero block is a layout that adapts to the count of
            selected variants: 0 picks → fallback hero (greyscale CTA),
            1 pick → square hero, 2 picks → 50/50 split, 3 picks → mosaic.
            Below the hero we render a multi-select picker (when 2-3 variants
            exist) with order badges and inline X-on-hover deselection. */}
        {effectiveVisual && heroVariant && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="
              notranslate px-4 pt-3 pb-1
              border-t border-gray-100 dark:border-dark-border/30
            "
            translate="no"
          >
            <div className="max-w-md mx-auto w-full">
              {/* Hero block — adaptive layout based on selection count.
                  Always square (1080² source) so the rhythm with the
                  standalone card stays identical. */}
              <div
                className="
                  relative w-full aspect-square overflow-hidden
                  rounded-xl
                  border border-gray-200 dark:border-dark-border
                  bg-gray-50 dark:bg-dark-elevated
                "
                aria-label={
                  selectedVariants.length === 0
                    ? "Aucun visuel sélectionné"
                    : `${selectedVariants.length} visuel${selectedVariants.length > 1 ? "s" : ""} sélectionné${selectedVariants.length > 1 ? "s" : ""}`
                }
              >
                <AttachedHeroLayout
                  selectedVariants={selectedVariants}
                  heroVariant={heroVariant}
                  selectedIndices={safeSelectedIndices}
                  onToggle={effectiveVisual.onToggle}
                />
                {selectedVariants.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] pointer-events-none">
                    <span className="text-[12px] uppercase tracking-wider font-semibold text-white/90">
                      Aucun visuel — ce post sera publié seul
                    </span>
                  </div>
                )}
                {effectiveVisual.isRegenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <svg
                      className="w-6 h-6 text-white animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Variant picker — appears only when more than one variant
                  was generated. Multi-select with numbered order badge in
                  click order; click an already-selected variant to deselect. */}
              {hasMultipleVariants && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">
                      Sélectionne 1 à {effectiveVisual.variants.length} visuels
                    </span>
                    {effectiveVisual.onRegenerate && effectiveVisual.canRegenerate !== false && (
                      <button
                        type="button"
                        onClick={effectiveVisual.onRegenerate}
                        disabled={effectiveVisual.isRegenerating}
                        className="
                          inline-flex items-center gap-1
                          text-[11px] font-medium
                          text-[#F8935D] hover:text-[#F76B54]
                          disabled:opacity-40 disabled:cursor-not-allowed
                          transition-colors
                        "
                        aria-label="Régénérer les variantes"
                        title="Régénérer 3 nouvelles variantes"
                      >
                        <svg
                          className={`w-3 h-3 ${effectiveVisual.isRegenerating ? "animate-spin" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Régénérer
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {effectiveVisual.variants.map((v, i) => {
                      const order = safeSelectedIndices.indexOf(i);
                      const isSelected = order >= 0;
                      return (
                        <button
                          key={v.imageId + i}
                          type="button"
                          onClick={() => effectiveVisual.onToggle(i)}
                          aria-pressed={isSelected}
                          aria-label={
                            isSelected
                              ? `Variante ${i + 1} — sélectionnée en position ${order + 1}. Cliquer pour retirer.`
                              : `Variante ${i + 1} — cliquer pour ajouter.`
                          }
                          className={`
                            group/thumb relative aspect-square rounded-lg overflow-hidden
                            border-2 transition-all duration-200
                            ${
                              isSelected
                                ? "border-[#F8935D] ring-2 ring-[#F8935D]/30 shadow-[0_0_0_4px_rgba(248,147,93,0.10)]"
                                : "border-transparent hover:border-gray-300 dark:hover:border-dark-border"
                            }
                          `}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v.url}
                            alt={`Variante ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#F8935D]/10 pointer-events-none" />
                          )}
                          {isSelected && (
                            <div
                              className="
                                absolute top-1.5 left-1.5
                                bg-[#F8935D] text-white
                                rounded-full w-6 h-6
                                flex items-center justify-center
                                text-[11px] font-bold
                                shadow-sm
                                pointer-events-none
                              "
                            >
                              {order + 1}
                            </div>
                          )}
                          {isSelected && (
                            <span
                              role="presentation"
                              aria-hidden="true"
                              className="
                                absolute top-1.5 right-1.5
                                w-5 h-5 rounded-full
                                flex items-center justify-center
                                bg-white/95 dark:bg-dark-card/95
                                text-gray-700 dark:text-text-primary
                                shadow-sm shadow-black/10
                                opacity-0 group-hover/thumb:opacity-100
                                transition-opacity duration-150
                                pointer-events-none
                              "
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-text-secondary">
                    {safeSelectedIndices.length === 0
                      ? "Aucun visuel ne sera publié."
                      : `${safeSelectedIndices.length} visuel${safeSelectedIndices.length > 1 ? "s" : ""} publié${safeSelectedIndices.length > 1 ? "s" : ""} avec ce post.`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* "+ Visuel" — variant-count picker shown UNDER the post when:
              - the stream has finished
              - no visual is attached or rendering
              - the parent passed onAddVisual (last AI bubble only)
            User picks how many variants (1, 2, 3) to generate — one tap on
            the number fires the pipeline directly. The cost is the same
            (1 user credit) whatever the count, but rendering 3 takes ~50%
            longer than 1, so we let the user trade speed vs. choice. */}
        {onAddVisual && !effectiveVisual && !attachedImageLoading && !isStreaming && content && (
          <AddVisualPicker onPick={(count) => {
            triggerHaptic?.();
            onAddVisual(content, count);
          }} />
        )}

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

/**
 * Renders the hero block above the variant picker. Layout adapts to how many
 * variants the user picked: 1 = single square, 2 = vertical split (50/50),
 * 3 = mosaic (one tall left + two stacked right). Each cell carries an
 * always-on X to deselect — gives the user the same one-click removal the
 * publish modal already exposes, but inline in the conversation.
 *
 * When no variants are selected, falls back to the first available variant
 * in a muted state — the caller overlays the "Aucun visuel" hint.
 */
function AttachedHeroLayout({
  selectedVariants,
  heroVariant,
  selectedIndices,
  onToggle,
}: {
  selectedVariants: Array<{ url: string; imageId: string; alt?: string }>;
  heroVariant: { url: string; imageId: string; alt?: string };
  selectedIndices: number[];
  onToggle: (index: number) => void;
}) {
  // No selection: render the hero as a muted backdrop. Click reactivates it.
  if (selectedVariants.length === 0) {
    return (
      <div className="relative w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroVariant.url}
          alt={heroVariant.alt || "Visuel non sélectionné"}
          className="w-full h-full object-cover grayscale opacity-50"
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  }

  // Single selection — full-bleed hero, click X to deselect (publish without
  // visual). Click image opens full-size.
  if (selectedVariants.length === 1) {
    return (
      <HeroCell
        variant={selectedVariants[0]}
        sourceIndex={selectedIndices[0]}
        onRemove={() => onToggle(selectedIndices[0])}
        roundedClass=""
      />
    );
  }

  // Two selections — 50/50 vertical split.
  if (selectedVariants.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 w-full h-full">
        {selectedVariants.map((v, k) => (
          <HeroCell
            key={v.imageId + k}
            variant={v}
            sourceIndex={selectedIndices[k]}
            onRemove={() => onToggle(selectedIndices[k])}
            roundedClass=""
          />
        ))}
      </div>
    );
  }

  // Three selections — mosaic: one tall on left, two stacked on right.
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
      <div className="row-span-2 relative">
        <HeroCell
          variant={selectedVariants[0]}
          sourceIndex={selectedIndices[0]}
          onRemove={() => onToggle(selectedIndices[0])}
          roundedClass=""
        />
      </div>
      <HeroCell
        variant={selectedVariants[1]}
        sourceIndex={selectedIndices[1]}
        onRemove={() => onToggle(selectedIndices[1])}
        roundedClass=""
      />
      <HeroCell
        variant={selectedVariants[2]}
        sourceIndex={selectedIndices[2]}
        onRemove={() => onToggle(selectedIndices[2])}
        roundedClass=""
      />
    </div>
  );
}

function HeroCell({
  variant,
  sourceIndex,
  onRemove,
  roundedClass,
}: {
  variant: { url: string; imageId: string; alt?: string };
  sourceIndex: number;
  onRemove: () => void;
  roundedClass: string;
}) {
  return (
    <div className={`group/hero relative w-full h-full overflow-hidden ${roundedClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant.url}
        alt={variant.alt || `Visuel sélectionné (variante ${sourceIndex + 1})`}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/hero:scale-[1.02]"
        loading="lazy"
        draggable={false}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Retirer le visuel ${sourceIndex + 1}`}
        title="Retirer ce visuel"
        className="
          absolute top-2 right-2
          w-7 h-7 rounded-full
          flex items-center justify-center
          bg-black/55 hover:bg-black/75
          text-white
          backdrop-blur-sm
          shadow-sm
          opacity-0 group-hover/hero:opacity-100
          focus-visible:opacity-100
          transition-opacity duration-150
        "
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * AddVisualPicker — segmented control "1 / 2 / 3" for choosing how many
 * variants to generate. Each cell is the click target; no intermediate
 * "Generate" button, the pick IS the action. Brand-orange so it reads as
 * the same affordance as the previous full-width CTA.
 */
function AddVisualPicker({ onPick }: { onPick: (count: 1 | 2 | 3) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="px-4 pt-3 pb-1"
    >
      <div
        className="
          flex items-stretch gap-1
          rounded-xl p-1
          bg-[#FFF1E8] dark:bg-[#F8935D]/15
          border border-[#F8935D]/60 dark:border-[#F8935D]/40
          shadow-[0_1px_2px_-1px_rgba(247,107,84,0.2)]
        "
      >
        <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 text-[#C0421F] dark:text-[#F8935D] text-[12.5px] font-semibold whitespace-nowrap">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Visuels
        </div>
        {([1, 2, 3] as const).map((n) => (
          <motion.button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            aria-label={`Générer ${n} visuel${n > 1 ? "s" : ""}`}
            className="
              flex-1 flex items-center justify-center
              py-2 rounded-lg
              text-[14px] font-bold tabular-nums
              text-[#C0421F] dark:text-[#F8935D]
              bg-white/60 dark:bg-white/[0.04]
              hover:bg-white dark:hover:bg-white/[0.08]
              border border-[#F8935D]/30 dark:border-[#F8935D]/30
              hover:border-[#F76B54] dark:hover:border-[#F8935D]/60
              transition-colors duration-150
              cursor-pointer
            "
          >
            {n}
          </motion.button>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] text-text-muted px-1">
        Choisis le nombre de variantes à générer · 1 crédit visuel.
      </p>
    </motion.div>
  );
}

export default ModernResponseCard;
