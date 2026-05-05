"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { getAuthHeaders } from "@/lib/api/client";
import {
  getReadyPostBody,
  LOCKED_PREVIEW_POSTS,
  type ReadyPostCategory,
} from "@/lib/data/ready-posts";

interface ReadyPostEditorProps {
  isOpen: boolean;
  category: ReadyPostCategory | null;
  /** Max plan → AI-generated, personalized post; publish/schedule actions enabled. */
  unlocked: boolean;
  /** UserProfile.profile, kept for future enrichment of locked previews. */
  profile?: import("@/types").UserProfile["profile"];
  onClose: () => void;
  onPublishNow: (content: string) => void;
  onSchedule: (content: string) => void;
  onUpgrade: () => void;
}

/** Highlights hashtags and mentions in LinkedIn blue, matching ModernResponseCard. */
function formatPostContent(text: string): ReactNode[] {
  return text.split(/(#[\wÀ-ɏ]+|@[\wÀ-ɏ]+)/g).map((part, i) => {
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

/**
 * ReadyPostEditor — LinkedIn-Preview-styled viewer for ready posts.
 *
 * Max plan: each open triggers an AI generation through /api/ready-posts/generate,
 * personalized via the user's profile + memory. Results are cached per
 * category for the lifetime of this component instance, so re-opening the
 * same chip doesn't re-burn tokens. A regenerate button forces a fresh call.
 *
 * Free / Pro: stays on LOCKED_PREVIEW_POSTS decoys (no API call, no token cost).
 */
export default function ReadyPostEditor({
  isOpen,
  category,
  unlocked,
  onClose,
  onPublishNow,
  onSchedule,
  onUpgrade,
}: ReadyPostEditorProps) {
  const { t, language } = useLanguage();
  const { userProfile } = useAuth();
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Locked decoy text — never goes through the API.
  const lockedContent = useMemo(() => {
    if (!category) return "";
    const decoy = LOCKED_PREVIEW_POSTS.find((p) => p.category === category);
    return decoy ? getReadyPostBody(decoy, language) : "";
  }, [category, language]);

  // Per-category content cache (Max only) — survives modal close/reopen for this mount.
  const cacheRef = useRef<Map<ReadyPostCategory, string>>(new Map());

  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Fetches a fresh personalized post from the server. Skips for Free/Pro
   * (they only ever see the locked decoy).
   */
  const fetchGenerated = useCallback(
    async (cat: ReadyPostCategory, force: boolean) => {
      if (!unlocked) return;

      if (!force) {
        const cached = cacheRef.current.get(cat);
        if (cached) {
          setGeneratedContent(cached);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/ready-posts/generate", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, language }),
        });
        if (!res.ok) {
          let code = "";
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            code = j.error || "";
            msg = j.message || code || msg;
          } catch {}
          // Log the full server response so the developer console immediately
          // surfaces whether it's auth / plan / openai / generation that broke.
          console.error("[ready-posts/generate] failed:", { status: res.status, code, msg });
          throw new Error(code ? `${code}: ${msg}` : msg);
        }
        const data: { content?: string } = await res.json();
        if (!data.content) throw new Error("Empty response");
        cacheRef.current.set(cat, data.content);
        setGeneratedContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setLoading(false);
      }
    },
    [unlocked, language],
  );

  // Trigger generation on open + category change (Max only).
  useEffect(() => {
    if (!isOpen || !category) return;
    setCopied(false);
    setIsMenuOpen(false);
    if (unlocked) {
      void fetchGenerated(category, false);
    } else {
      setGeneratedContent("");
      setError(null);
    }
  }, [isOpen, category, unlocked, fetchGenerated]);

  // Close the "+" dropdown on outside click.
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isMenuOpen]);

  if (!category) return null;

  const content = unlocked ? generatedContent : lockedContent;
  const showSkeleton = unlocked && loading;
  const showError = unlocked && !loading && !!error;
  const showActions = unlocked && !loading && !error && content.trim().length > 0;

  const categoryLabel =
    (t.readyPosts.categories as Record<string, string>)[category] ?? category;

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

  const handlePublish = () => {
    triggerHaptic("light");
    onPublishNow(content);
  };

  const handleScheduleClick = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    onSchedule(content);
  };

  const handleRegenerate = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    if (category) void fetchGenerated(category, true);
  };

  const toggleMenu = () => {
    setIsMenuOpen((v) => !v);
    triggerHaptic("light");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryLabel}
      size="lg"
      description={unlocked ? t.readyPosts.editor.description : t.readyPosts.lock.subtitle}
    >
      <div className="space-y-3">
        {/* LinkedIn Preview Card (mirrors ModernResponseCard) */}
        <div className="relative bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border/50 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border/30 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <span className="text-xs font-medium text-gray-500 dark:text-text-muted">
              {t.ui.linkedInPreview}
            </span>
          </div>

          {/* Author info */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-start gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-elevated dark:to-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                {userProfile?.photoURL ? (
                  <Image
                    src={userProfile.photoURL}
                    alt=""
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
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
                  {t.ui.justNow} ·{" "}
                  <svg className="w-3 h-3 inline-block -mt-px" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4v4l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </p>
              </div>
            </div>
          </div>

          {/* Post content */}
          <div className="px-4 pb-3 relative min-h-[140px]">
            {showSkeleton ? (
              <div className="space-y-2 py-2" aria-busy="true" aria-live="polite">
                {[100, 92, 96, 84, 78, 90, 70].map((w, i) => (
                  <motion.div
                    key={i}
                    className="h-3 rounded-full bg-gray-200 dark:bg-dark-border/60"
                    style={{ width: `${w}%` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.08,
                    }}
                  />
                ))}
                <p className="pt-3 text-xs text-text-muted">
                  {t.readyPosts.editor.generating}
                </p>
              </div>
            ) : showError ? (
              <div className="py-3">
                <p className="text-sm text-error mb-1">
                  {t.readyPosts.editor.errorTitle}
                </p>
                {error && (
                  <p className="text-[11px] text-text-muted mb-3 font-mono break-all">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="
                    inline-flex items-center gap-1.5
                    text-xs font-medium
                    text-[#F8935D] hover:text-[#F76B54]
                    transition-colors
                  "
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t.readyPosts.editor.retry}
                </button>
              </div>
            ) : (
              <div
                aria-hidden={!unlocked}
                className={`
                  whitespace-pre-wrap break-words overflow-wrap-anywhere
                  text-[14px] leading-relaxed text-gray-900 dark:text-text-primary
                  ${unlocked ? "" : "blur-md select-none pointer-events-none"}
                `}
              >
                {formatPostContent(content)}
              </div>
            )}
          </div>

          {/* Engagement footer + inline action buttons */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border/30">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-text-muted">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center text-[9px]">👍</span>
                  <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[9px]">❤️</span>
                  <span className="w-[18px] h-[18px] rounded-full bg-yellow-500 flex items-center justify-center text-[9px]">💡</span>
                </div>
                <span className="ml-1 text-gray-400 dark:text-text-muted/70">
                  {t.ui.previewLabel}
                </span>
              </div>

              {showActions && (
                <div className="flex items-center gap-1.5">
                  {/* Regenerate */}
                  <motion.button
                    onClick={handleRegenerate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="
                      group/regen relative overflow-hidden
                      inline-flex items-center justify-center
                      w-7 h-7 rounded-md
                      bg-gray-100 dark:bg-dark-elevated
                      hover:bg-gray-200 dark:hover:bg-dark-hover
                      border border-gray-200 dark:border-dark-border
                      hover:border-primary/30
                      transition-all duration-200
                    "
                    aria-label={t.readyPosts.editor.regenerate}
                    title={t.readyPosts.editor.regenerate}
                  >
                    <svg className="w-3.5 h-3.5 text-text-muted group-hover/regen:text-primary transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </motion.button>

                  {/* Copy */}
                  <motion.button
                    onClick={handleCopy}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
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

                  {/* Publish */}
                  <motion.button
                    onClick={handlePublish}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
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

                  {/* More actions ("+") with dropdown */}
                  <div className="relative">
                    <motion.button
                      ref={triggerRef}
                      onClick={toggleMenu}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
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

                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          ref={menuRef}
                          initial={{ opacity: 0, scale: 0.95, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 4 }}
                          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                          style={{ transformOrigin: "bottom right" }}
                          className="
                            absolute right-0 bottom-full mb-1.5
                            min-w-[180px] z-20
                            bg-white dark:bg-dark-card
                            border border-gray-200 dark:border-dark-border
                            rounded-lg shadow-lg
                            overflow-hidden
                          "
                          role="menu"
                        >
                          <button
                            onClick={handleScheduleClick}
                            type="button"
                            className="
                              w-full px-3 py-2 text-left
                              flex items-center gap-2
                              text-sm text-text-primary
                              hover:bg-light-hover dark:hover:bg-dark-hover
                              transition-colors
                            "
                            role="menuitem"
                          >
                            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {t.ui.schedule}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Locked overlay sits ABOVE the card content, INSIDE the card frame */}
          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/40 via-white/75 to-white/95 dark:from-dark-card/50 dark:via-dark-card/80 dark:to-dark-card/95 backdrop-blur-[2px]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-base font-bold text-text-primary mb-1 px-4 text-center">
                {t.readyPosts.lock.title}
              </p>
              <p className="text-xs text-text-secondary px-6 text-center max-w-sm mb-4">
                {t.readyPosts.lock.subtitle}
              </p>
              <Button variant="premium" onClick={onUpgrade} size="sm" type="button">
                {t.readyPosts.lock.cta}
              </Button>
            </div>
          )}
        </div>

        {showActions && (
          <p className="text-[11px] text-text-muted text-center">
            {t.readyPosts.editor.editHint}
          </p>
        )}
      </div>
    </Modal>
  );
}
