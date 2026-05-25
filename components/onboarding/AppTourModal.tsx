"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import {
  MockupWelcome,
  MockupPostGeneration,
  MockupVisuals,
  MockupScheduling,
  MockupOptimization,
} from "./AppTourMockups";

interface AppTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  Mockup: () => ReactElement;
  /** Tailwind utility for the slide hero background. References a centralized
   *  signature gradient token (see `tailwind.config.ts` → backgroundImage). */
  gradient: string;
  /** Companion glow shadow token paired with the gradient. */
  glow: string;
}

const FALLBACK_COPY: Record<string, { eyebrow: string; title: string; description: string }> = {
  welcome: {
    eyebrow: "Welcome",
    title: "Meet Posty, your AI co-pilot",
    description: "A premium workspace built to turn your ideas into LinkedIn posts that grow your audience — without the empty page.",
  },
  posts: {
    eyebrow: "Smart writing",
    title: "Generate posts that sound like you",
    description: "Chat in natural language. Posty captures your voice, your sector, your audience — and drafts posts ready to ship.",
  },
  visuals: {
    eyebrow: "AI visuals",
    title: "Striking visuals, instantly",
    description: "Get multiple on-brand variants for every post. Pick the one that fits — carousels, illustrations, hero images.",
  },
  schedule: {
    eyebrow: "Publish everywhere",
    title: "Schedule across platforms",
    description: "Plan your week, publish in one click on LinkedIn, X, Bluesky, Threads and more. Posty handles the timing.",
  },
  optimize: {
    eyebrow: "Growth engine",
    title: "Optimize for engagement",
    description: "Live hook scores, analytics, and AI suggestions guide every post toward stronger reach and conversation.",
  },
};

// Slide enter/exit choreography — direction-aware horizontal slide
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 280, damping: 30, mass: 0.6 },
  opacity: { duration: 0.22 },
};

export default function AppTourModal({ isOpen, onClose }: AppTourModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to slide 1 every time the tour reopens
  useEffect(() => {
    if (isOpen) setPage([0, 0]);
  }, [isOpen]);

  useScrollLock(isOpen);

  // Pull translated copy with a graceful fallback so we never render undefined.
  const tour = (t as unknown as { appTour?: Record<string, { eyebrow: string; title: string; description: string }> }).appTour;

  const slides: Slide[] = useMemo(
    () => [
      {
        id: "welcome",
        ...(tour?.welcome ?? FALLBACK_COPY.welcome),
        Mockup: MockupWelcome,
        gradient: "bg-signature-welcome",
        glow: "shadow-glow",
      },
      {
        id: "posts",
        ...(tour?.posts ?? FALLBACK_COPY.posts),
        Mockup: MockupPostGeneration,
        gradient: "bg-signature-posts",
        glow: "shadow-glow-posts",
      },
      {
        id: "visuals",
        ...(tour?.visuals ?? FALLBACK_COPY.visuals),
        Mockup: MockupVisuals,
        gradient: "bg-signature-visuals",
        glow: "shadow-glow-visuals",
      },
      {
        id: "schedule",
        ...(tour?.schedule ?? FALLBACK_COPY.schedule),
        Mockup: MockupScheduling,
        gradient: "bg-signature-schedule",
        glow: "shadow-glow-schedule",
      },
      {
        id: "optimize",
        ...(tour?.optimize ?? FALLBACK_COPY.optimize),
        Mockup: MockupOptimization,
        gradient: "bg-signature-optimize",
        glow: "shadow-glow-optimize",
      },
    ],
    [tour]
  );

  const total = slides.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const current = slides[index];
  const labels = (tour?.controls as { skip?: string; back?: string; next?: string; start?: string } | undefined) ?? {};

  const paginate = useCallback(
    (delta: number) => {
      setPage(([currentIndex]) => {
        const next = currentIndex + delta;
        if (next < 0 || next >= total) return [currentIndex, delta];
        return [next, delta];
      });
    },
    [total]
  );

  const goToIndex = useCallback(
    (target: number) => {
      setPage(([currentIndex]) => {
        if (target === currentIndex) return [currentIndex, 0];
        return [target, target > currentIndex ? 1 : -1];
      });
    },
    []
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
    } else {
      paginate(1);
    }
  }, [isLast, onClose, paginate]);

  // Keyboard navigation: ←/→ to navigate, Esc to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") paginate(1);
      else if (e.key === "ArrowLeft") paginate(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, paginate]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
        >
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal shell */}
          <motion.div
            data-modal-content
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 280, mass: 0.55 }}
            className="
              relative w-full max-w-3xl
              bg-light-card dark:bg-dark-card
              border border-light-border dark:border-dark-border
              rounded-3xl overflow-hidden
              shadow-elevated
              max-h-[92vh] flex flex-col
            "
          >
            {/* Top controls */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-5 pointer-events-none">
              <button
                onClick={onClose}
                className="
                  pointer-events-auto text-xs font-semibold uppercase tracking-wider
                  text-white/80 hover:text-white
                  px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm
                  transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                {labels.skip ?? "Skip"}
              </button>
              <button
                onClick={onClose}
                aria-label={labels.skip ?? "Close"}
                className="
                  pointer-events-auto flex items-center justify-center w-9 h-9
                  text-white/85 hover:text-white
                  rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm
                  transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* Carousel viewport */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence custom={direction} mode="wait" initial={false}>
                <motion.div
                  key={current.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="flex flex-col"
                >
                  {/* Hero / mockup zone — uses a centralized signature gradient
                      token so the same DA is reusable across the product. */}
                  <div
                    className={`
                      relative w-full
                      h-[280px] sm:h-[320px]
                      ${current.gradient}
                      overflow-hidden
                    `}
                  >
                    {/* Subtle noise overlay for premium feel */}
                    <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4), transparent 40%)",
                      }}
                    />
                    <current.Mockup />
                  </div>

                  {/* Text content */}
                  <div className="px-6 sm:px-10 pt-7 sm:pt-8 pb-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${current.gradient}`} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                        {current.eyebrow}
                      </span>
                    </div>
                    <h2 className="mt-2.5 text-2xl sm:text-[28px] font-bold text-text-primary leading-tight tracking-tight">
                      {current.title}
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-text-secondary max-w-[520px] mx-auto sm:mx-0">
                      {current.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer navigation */}
            <div className="flex-shrink-0 px-6 sm:px-10 pt-4 pb-5 sm:pb-6 flex items-center justify-between gap-4 border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
              {/* Progress dots — active dot inherits the current slide's
                  signature gradient AND its matching glow shadow, so the
                  progress indicator visually echoes the hero zone above. */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
                {slides.map((s, i) => {
                  const isActive = i === index;
                  return (
                    <button
                      key={s.id}
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => goToIndex(i)}
                      className="group relative h-2 flex items-center focus:outline-none"
                    >
                      <motion.span
                        animate={{ width: isActive ? 24 : 8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={`
                          block h-2 rounded-full transition-colors duration-300
                          ${isActive
                            ? `${current.gradient} ${current.glow}`
                            : "bg-light-border dark:bg-dark-border group-hover:bg-text-muted/40"}
                        `}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => paginate(-1)}
                  disabled={isFirst}
                  className={`
                    inline-flex items-center justify-center gap-1.5
                    h-10 px-4 rounded-xl text-sm font-semibold
                    text-text-secondary
                    bg-light-hover dark:bg-dark-hover
                    hover:bg-light-active dark:hover:bg-dark-active
                    disabled:opacity-0 disabled:pointer-events-none
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                  `}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">{labels.back ?? "Back"}</span>
                </button>

                <button
                  onClick={handleNext}
                  className={`
                    inline-flex items-center justify-center gap-1.5
                    h-10 px-5 sm:px-6 rounded-xl text-sm font-semibold
                    text-white
                    bg-gradient-to-r from-brand-orange to-brand-rose
                    shadow-btn-primary hover:shadow-btn-primary-hover
                    hover:-translate-y-[1px] active:translate-y-0
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-light-card dark:focus-visible:ring-offset-dark-card
                  `}
                >
                  <span>{isLast ? (labels.start ?? "Get started") : (labels.next ?? "Next")}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
