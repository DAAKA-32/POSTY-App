"use client";

import { useState, memo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "@/components/ui/Toast";

// Premium animation easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Helper function to format timestamp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTimeAgo(date: Date, t: any): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t.ui.justNow;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t.ui.minutesAgo.replace("{n}", String(diffInMinutes));
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t.ui.hoursAgo.replace("{n}", String(diffInHours));
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t.ui.daysAgo.replace("{n}", String(diffInDays));
  }

  return date.toLocaleDateString(t.ui.timeLocale, { day: "numeric", month: "short" });
}

interface ResponseData {
  id: string;
  content: string;
  variant: "storytelling" | "business";
  timestamp?: Date;
  isStreaming?: boolean;
}

export interface AIResponsePairProps {
  storytellingResponse: ResponseData;
  businessResponse: ResponseData;
  onCopy?: (content: string) => void;
  onPublishToLinkedIn?: (content: string) => void;
  onSchedule?: (content: string) => void;
  onSelectVersion?: (variant: "storytelling" | "business", content: string) => void;
  index?: number;
}

// Variant styles configuration - Using Posty brand colors (coral/orange)
const variantStyles = {
  storytelling: {
    badge: "bg-accent/20 text-accent border-accent/30",
    badgeActive: "bg-accent/30 text-accent-light border-accent/50 shadow-[0_0_12px_rgba(248,87,81,0.2)]",
    label: "Storytelling",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    gradient: "from-accent/10 to-accent/5",
    dotColor: "bg-accent",
    textColor: "text-accent",
  },
  business: {
    badge: "bg-primary/20 text-primary border-primary/30",
    badgeActive: "bg-primary/30 text-primary-light border-primary/50 shadow-[0_0_12px_rgba(232,147,77,0.2)]",
    label: "Business",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    gradient: "from-primary/10 to-primary/5",
    dotColor: "bg-primary",
    textColor: "text-primary",
  },
};

// Skeleton placeholder for waiting responses (stable dual layout)
const ResponseSkeleton = memo(function ResponseSkeleton({
  variant,
  isMobile = false,
}: {
  variant: "storytelling" | "business";
  isMobile?: boolean;
}) {
  const { t } = useLanguage();
  const styles = variantStyles[variant];

  return (
    <div
      className={`
        flex flex-col h-full
        bg-dark-card border border-dark-border rounded-xl
        overflow-hidden
        ${isMobile ? "min-h-[320px]" : ""}
      `}
    >
      {/* Header with badge */}
      <div className={`px-4 py-3 border-b border-dark-border bg-gradient-to-r ${styles.gradient}`}>
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full
            border ${styles.badge}
          `}
        >
          {styles.icon}
          {styles.label}
        </span>
      </div>

      {/* Skeleton lines */}
      <div className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {[85, 100, 70, 55, 90].map((width, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.12 }}
              className="h-3 rounded-md bg-dark-border/40"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dotColor}`}
          />
          {t.ui.waiting}
        </div>
      </div>
    </div>
  );
});

// Single Response Card Component
const ResponseCard = memo(function ResponseCard({
  response,
  onCopy,
  onPublishToLinkedIn,
  onSchedule,
  onSelectVersion,
  isActive = true,
  isMobile = false,
}: {
  response: ResponseData;
  onCopy?: (content: string) => void;
  onPublishToLinkedIn?: (content: string) => void;
  onSchedule?: (content: string) => void;
  onSelectVersion?: (variant: "storytelling" | "business", content: string) => void;
  isActive?: boolean;
  isMobile?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { canSchedulePosts } = useSubscription();
  const { t } = useLanguage();
  const styles = variantStyles[response.variant];

  // Check if scheduling is available for the user's plan
  const canSchedule = canSchedulePosts().allowed;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopied(true);
      triggerHaptic("success");
      toast.success(t.ui.copied);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(response.content);
    } catch {
      triggerHaptic("error");
      toast.error(t.ui.copyFailed);
    }
  };

  const handlePublish = () => {
    triggerHaptic("light");
    onPublishToLinkedIn?.(response.content);
  };

  const handleSelect = () => {
    triggerHaptic("medium");
    onSelectVersion?.(response.variant, response.content);
    toast.success(`${styles.label} ✓`);
  };

  const handleSchedule = () => {
    triggerHaptic("light");
    onSchedule?.(response.content);
  };

  return (
    <div
      className={`
        flex flex-col h-full
        bg-dark-card border border-dark-border rounded-xl
        overflow-hidden transition-all duration-300
        hover:border-dark-hover hover:shadow-xl
        ${isMobile ? "min-h-[320px]" : ""}
      `}
    >
      {/* Header with badge */}
      <div className={`px-4 py-3 border-b border-dark-border bg-gradient-to-r ${styles.gradient}`}>
        <div className="flex items-center justify-between">
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full
              border transition-all duration-300
              ${styles.badgeActive}
            `}
          >
            {styles.icon}
            {styles.label}
          </span>
          {response.timestamp && (
            <span className="text-xs text-text-muted">
              {formatTimeAgo(response.timestamp, t)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
        <div className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
          {response.content}
          {response.isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
            />
          )}
        </div>
      </div>

      {/* Actions - hidden while streaming */}
      {!response.isStreaming && response.content && (
        <div className="px-4 py-3 border-t border-dark-border bg-dark-elevated/30">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="flex-1 text-xs px-3 py-2 h-auto justify-center"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.ui.copied}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t.ui.copy}
                </>
              )}
            </Button>
            {onPublishToLinkedIn && (
              <Button
                size="sm"
                onClick={handlePublish}
                className="flex-1 text-xs px-3 py-2 h-auto bg-[#0A66C2] hover:bg-[#004182] border-none justify-center"
              >
                <LinkedInIcon className="w-3.5 h-3.5 mr-1.5" />
                {t.ui.publish}
              </Button>
            )}
            {onSchedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSchedule}
                className={`flex-1 text-xs px-3 py-2 h-auto justify-center relative ${!canSchedule ? "pr-10" : ""}`}
                title={canSchedule ? t.ui.schedulePost : `${t.ui.schedulePost} (Pro)`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.ui.schedule}
                {!canSchedule && (
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[9px] font-bold bg-gradient-to-r from-primary to-accent text-white rounded">
                    PRO
                  </span>
                )}
              </Button>
            )}
          </div>
          {/* Optional: Select version button */}
          {onSelectVersion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelect}
              className={`w-full mt-2 text-xs h-auto py-2 ${styles.textColor} border border-current/30 hover:bg-current/10`}
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t.ui.selectVersion}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

// Main AIResponsePair Component
const AIResponsePair = memo(function AIResponsePair({
  storytellingResponse,
  businessResponse,
  onCopy,
  onPublishToLinkedIn,
  onSchedule,
  onSelectVersion,
  index = 0,
}: AIResponsePairProps) {
  // Mobile navigation state: 0 = storytelling, 1 = business
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const responses = [storytellingResponse, businessResponse];
  const activeResponse = responses[activeIndex];

  // Handle swipe navigation
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      // Swipe left (next) - negative offset
      if (offset < -threshold || velocity < -500) {
        if (activeIndex < responses.length - 1) {
          setDirection(1);
          setActiveIndex(activeIndex + 1);
          triggerHaptic("light");
        }
      }
      // Swipe right (prev) - positive offset
      else if (offset > threshold || velocity > 500) {
        if (activeIndex > 0) {
          setDirection(-1);
          setActiveIndex(activeIndex - 1);
          triggerHaptic("light");
        }
      }
    },
    [activeIndex, responses.length, triggerHaptic]
  );

  const handleNavigate = (dir: "next" | "prev") => {
    triggerHaptic("light");
    if (dir === "next" && activeIndex < responses.length - 1) {
      setDirection(1);
      setActiveIndex(activeIndex + 1);
    } else if (dir === "prev" && activeIndex > 0) {
      setDirection(-1);
      setActiveIndex(activeIndex - 1);
    }
  };

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if the container is focused or contains focus
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNavigate("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex]);

  // Animation variants for mobile slide with improved physics
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.95,
    }),
  };

  const currentStyles = variantStyles[activeResponse.variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
        ease: smoothEase,
      }}
      className="w-full"
    >
      {/* POSTY Avatar and Label */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
          <img
            src="/logo.png"
            alt="Posty"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xs text-text-muted font-medium">POSTY</span>
      </div>

      {/* ===== DESKTOP / TABLET: Side by side (split-view) ===== */}
      <div className="hidden md:block">
        {/* Desktop pagination indicator */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-xs text-primary font-medium">{t.ui.twoVersionsAvailable}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${variantStyles.storytelling.dotColor}`} />
            <span className={`w-2 h-2 rounded-full ${variantStyles.business.dotColor}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-h-[120px]">
            {!storytellingResponse.content && storytellingResponse.isStreaming ? (
              <ResponseSkeleton variant="storytelling" />
            ) : (
              <ResponseCard
                response={storytellingResponse}
                onCopy={onCopy}
                onPublishToLinkedIn={onPublishToLinkedIn}
                onSchedule={onSchedule}
                onSelectVersion={onSelectVersion}
              />
            )}
          </div>
          <div className="min-h-[120px]">
            {!businessResponse.content && businessResponse.isStreaming ? (
              <ResponseSkeleton variant="business" />
            ) : (
              <ResponseCard
                response={businessResponse}
                onCopy={onCopy}
                onPublishToLinkedIn={onPublishToLinkedIn}
                onSchedule={onSchedule}
                onSelectVersion={onSelectVersion}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE: Carousel with swipe (carousel-view) ===== */}
      <div
        ref={containerRef}
        className="md:hidden relative"
        role="region"
        aria-label={t.ui.responseVersions}
        tabIndex={0}
      >
        {/* Premium animated arrow hint - attracts attention subtly */}
        <AnimatePresence>
          {activeIndex === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute top-1/2 -translate-y-1/2 right-2 z-20 pointer-events-none"
            >
              <motion.div
                animate={{
                  x: [0, 8, 0],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 0.5
                }}
                className="flex items-center gap-1"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card container with swipe */}
        <motion.div
          className="relative overflow-hidden rounded-xl touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ cursor: "grab" }}
          whileDrag={{ cursor: "grabbing" }}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 350, damping: 35 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              className="w-full"
            >
              {!activeResponse.content && activeResponse.isStreaming ? (
                <ResponseSkeleton variant={activeResponse.variant} isMobile />
              ) : (
                <ResponseCard
                  response={activeResponse}
                  onCopy={onCopy}
                  onPublishToLinkedIn={onPublishToLinkedIn}
                  onSchedule={onSchedule}
                  onSelectVersion={onSelectVersion}
                  isMobile={true}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Mobile Navigation Controls - Premium Design */}
        <div className="flex items-center justify-center mt-4">
          {/* Unified navigation pill */}
          <div className="flex items-center gap-1 bg-dark-elevated/80 backdrop-blur-sm rounded-full px-2 py-1.5 border border-dark-border/50">
            {/* Previous button */}
            <button
              onClick={() => handleNavigate("prev")}
              disabled={activeIndex === 0}
              className={`
                min-w-[44px] min-h-[44px] p-2.5 rounded-full transition-all duration-300
                flex items-center justify-center
                ${activeIndex === 0
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-dark-hover active:scale-90"
                }
              `}
              aria-label={t.ui.previousVersion}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Center: Premium "1 sur 2" indicator */}
            <div className="flex items-center gap-2 px-3">
              {/* Dots with active state */}
              <div className="flex items-center gap-1.5">
                {responses.map((r, idx) => {
                  const style = variantStyles[r.variant];
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(idx > activeIndex ? 1 : -1);
                        setActiveIndex(idx);
                        triggerHaptic("light");
                      }}
                      className={`
                        relative rounded-full transition-all duration-300 ease-out
                        ${idx === activeIndex
                          ? `w-6 h-2 ${style.dotColor} shadow-lg`
                          : "w-2 h-2 bg-dark-border hover:bg-dark-hover"
                        }
                      `}
                      aria-label={`${style.label}`}
                      aria-current={idx === activeIndex ? "true" : "false"}
                    />
                  );
                })}
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-dark-border/50" />

              {/* Label + Counter */}
              <div className="flex items-center gap-1.5 min-w-[100px] justify-center">
                <span className={`text-sm font-semibold ${currentStyles.textColor}`}>
                  {currentStyles.label}
                </span>
                <span className="text-xs text-text-muted bg-dark-card/50 px-1.5 py-0.5 rounded-md">
                  {activeIndex + 1} / {responses.length}
                </span>
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={() => handleNavigate("next")}
              disabled={activeIndex === responses.length - 1}
              className={`
                min-w-[44px] min-h-[44px] p-2.5 rounded-full transition-all duration-300
                flex items-center justify-center
                ${activeIndex === responses.length - 1
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-dark-hover active:scale-90"
                }
              `}
              aria-label={t.ui.nextVersion}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default AIResponsePair;

// Export ResponseCard for standalone use (single response mode)
export { ResponseCard };
export type { ResponseData };
