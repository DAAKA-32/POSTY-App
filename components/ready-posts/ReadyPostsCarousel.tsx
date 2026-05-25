"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CATEGORY_STYLES, type ReadyPostCategory } from "@/lib/data/ready-posts";

const CATEGORIES: ReadyPostCategory[] = [
  "success",
  "lesson",
  "question",
  "storytelling",
  "tips",
  "controversial",
];

// Use arbitrary opacity values (`/[0.NN]`) so Tailwind's JIT reliably
// generates the dark mode variants. Non-standard opacity steps like `/8`,
// `/12`, `/30`, `/35` are NOT in the default scale and were being silently
// dropped → dark-mode chips fell back to the opaque light backgrounds
// (`bg-cyan-50` etc), making them look bright/light against the dark shell.
const CHIP_TONES: Record<ReadyPostCategory, { bg: string; border: string }> = {
  storytelling: {
    bg: "bg-[#F8935D]/[0.08] dark:bg-[#F8935D]/[0.12]",
    border: "border-[#F8935D]/[0.30] dark:border-[#F8935D]/[0.35]",
  },
  tips: {
    bg: "bg-cyan-500/[0.08] dark:bg-cyan-500/[0.12]",
    border: "border-cyan-500/[0.30] dark:border-cyan-500/[0.35]",
  },
  controversial: {
    bg: "bg-violet-500/[0.08] dark:bg-violet-500/[0.12]",
    border: "border-violet-500/[0.30] dark:border-violet-500/[0.35]",
  },
  success: {
    bg: "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]",
    border: "border-emerald-500/[0.30] dark:border-emerald-500/[0.35]",
  },
  lesson: {
    bg: "bg-[#F8935D]/[0.08] dark:bg-[#F8935D]/[0.12]",
    border: "border-[#F8935D]/[0.30] dark:border-[#F8935D]/[0.35]",
  },
  question: {
    bg: "bg-cyan-500/[0.08] dark:bg-cyan-500/[0.12]",
    border: "border-cyan-500/[0.30] dark:border-cyan-500/[0.35]",
  },
};

// Per-category colored hover shadow — contextual depth, not generic black
const CHIP_HOVER_SHADOW: Record<ReadyPostCategory, string> = {
  storytelling: "0 8px 24px -4px rgba(248,147,93,0.32), 0 3px 10px -2px rgba(248,147,93,0.20)",
  tips:         "0 8px 24px -4px rgba(6,182,212,0.30),  0 3px 10px -2px rgba(6,182,212,0.18)",
  controversial:"0 8px 24px -4px rgba(139,92,246,0.30), 0 3px 10px -2px rgba(139,92,246,0.18)",
  success:      "0 8px 24px -4px rgba(16,185,129,0.30), 0 3px 10px -2px rgba(16,185,129,0.18)",
  lesson:       "0 8px 24px -4px rgba(248,147,93,0.32), 0 3px 10px -2px rgba(248,147,93,0.20)",
  question:     "0 8px 24px -4px rgba(6,182,212,0.30),  0 3px 10px -2px rgba(6,182,212,0.18)",
};

const REST_SHADOW = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
const TAP_SHADOW  = "0 1px 2px rgba(0,0,0,0.05)";

// Linear/Vercel-grade spring — snappy but not bouncy
const SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 26,
  mass: 0.7,
};

// Per-category icon personality on hover
const ICON_HOVER: Record<ReadyPostCategory, { rotate?: number; scale?: number; y?: number }> = {
  storytelling: { rotate: -8, scale: 1.2,  y: 0  },
  tips:         { rotate: 12, scale: 1.22, y: 0  },
  controversial:{ rotate: 0,  scale: 1.2,  y: 0  },
  success:      { rotate: 0,  scale: 1.25, y: -2 },
  lesson:       { rotate: -5, scale: 1.18, y: 0  },
  question:     { rotate: 6,  scale: 1.2,  y: 0  },
};

// ---------------------------------------------------------------------------
// CarouselChip — isolated sub-component so variant propagation works correctly
// (variant names must be on the same animate-controlled component hierarchy)
// ---------------------------------------------------------------------------

interface ChipProps {
  category: ReadyPostCategory;
  disabled: boolean;
  isDragging: boolean;
  label: string;
  onChipClick: (category: ReadyPostCategory, clientX: number, clientY: number) => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}

function CarouselChip({
  category,
  disabled,
  isDragging,
  label,
  onChipClick,
  onHoverEnter,
  onHoverLeave,
}: ChipProps) {
  const style  = CATEGORY_STYLES[category];
  const tone   = CHIP_TONES[category];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={(e: React.MouseEvent) => onChipClick(category, e.clientX, e.clientY)}
      onHoverStart={() => {
        if (disabled || isDragging) return;
        setIsHovered(true);
        onHoverEnter();
      }}
      onHoverEnd={() => {
        setIsHovered(false);
        onHoverLeave();
      }}
      draggable={false}
      className={[
        "template-chip-interactive",
        "flex-shrink-0 px-4 py-2.5 rounded-xl border-2",
        // Glass effect — backdrop blur + light saturation makes the per-category
        // tone sit on the page gradient like a frosted-glass pill.
        // Saturate boost only in light mode; on dark the bg is already vivid.
        "backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-100",
        tone.bg,
        tone.border,
        "flex items-center gap-2 select-none",
        disabled ? "cursor-not-allowed opacity-90" : "",
      ].join(" ")}
      // Variant names propagate to all motion children automatically
      animate={isHovered ? "hover" : "rest"}
      whileTap={disabled ? undefined : "tap"}
      variants={{
        rest: { scale: 1,    y: 0,  boxShadow: REST_SHADOW },
        hover:{ scale: 1.04, y: -3, boxShadow: CHIP_HOVER_SHADOW[category] },
        tap:  { scale: 0.97, y: 1,  boxShadow: TAP_SHADOW },
      }}
      transition={SPRING}
    >
      {/* Icon — animated with per-category personality via variant propagation */}
      <motion.span
        className="text-lg pointer-events-none"
        variants={{
          rest: { scale: 1,   rotate: 0,                y: 0   },
          hover:{ ...ICON_HOVER[category] },
          tap:  { scale: 0.9, rotate: 0,                y: 0   },
        }}
        transition={SPRING}
      >
        {style.icon}
      </motion.span>

      {/* Label — color/weight transition via CSS (no Framer re-render needed) */}
      <span
        className={[
          "text-xs whitespace-nowrap pointer-events-none transition-colors duration-150",
          isHovered && !disabled
            ? "text-gray-900 dark:text-white font-semibold"
            : "text-gray-700 dark:text-text-secondary font-medium",
        ].join(" ")}
      >
        {label}
      </span>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// ReadyPostsCarousel — infinite horizontal auto-scroll with drag + hover pause
// ---------------------------------------------------------------------------

interface ReadyPostsCarouselProps {
  disabled?: boolean;
  onPickCategory: (category: ReadyPostCategory) => void;
  className?: string;
}

export default function ReadyPostsCarousel({
  disabled = false,
  onPickCategory,
  className = "",
}: ReadyPostsCarouselProps) {
  const { t } = useLanguage();

  const tripled = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

  const [isDragging, setIsDragging] = useState(false);

  const containerRef       = useRef<HTMLDivElement>(null);
  const trackRef           = useRef<HTMLDivElement>(null);
  const animationRef       = useRef<number | null>(null);
  const lastTimeRef        = useRef(0);
  const isPausedRef        = useRef(false);
  const isDraggingRef      = useRef(false);
  const startXRef          = useRef(0);
  const scrollStartRef     = useRef(0);
  const scrollXRef         = useRef(0);
  const trackWidthRef      = useRef(0);
  const velocityRef        = useRef(0);
  const lastMoveTimeRef    = useRef(0);
  const lastMoveXRef       = useRef(0);
  const resumeTimeoutRef   = useRef<NodeJS.Timeout | null>(null);
  const hoverResumeRef     = useRef<NodeJS.Timeout | null>(null);
  const momentumRef        = useRef<number | null>(null);
  const clickStartRef      = useRef<{ x: number; y: number; time: number } | null>(null);

  const updateTrackWidth = useCallback(() => {
    if (trackRef.current) {
      trackWidthRef.current = trackRef.current.scrollWidth / 3;
    }
  }, []);

  const normalize = useCallback((pos: number) => {
    const w = trackWidthRef.current;
    if (w === 0) return pos;
    let n = pos % w;
    if (n < 0) n += w;
    return n;
  }, []);

  const animateFnRef = useRef<((ts: number) => void) | null>(null);
  const animate = useCallback(
    (timestamp: number) => {
      animationRef.current = requestAnimationFrame((ts) => animateFnRef.current?.(ts));

      if (isPausedRef.current || isDraggingRef.current) {
        lastTimeRef.current = timestamp;
        return;
      }

      if (trackWidthRef.current === 0 && trackRef.current) {
        trackWidthRef.current = trackRef.current.scrollWidth / 3;
        if (trackWidthRef.current === 0) {
          lastTimeRef.current = timestamp;
          return;
        }
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        return;
      }

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.02);
      lastTimeRef.current = timestamp;

      const newX = normalize(scrollXRef.current + 60 * dt);
      scrollXRef.current = newX;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-${newX}px, 0, 0)`;
      }
    },
    [normalize],
  );
  animateFnRef.current = animate;

  useEffect(() => {
    requestAnimationFrame(() => updateTrackWidth());
    window.addEventListener("resize", updateTrackWidth);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      animationRef.current = requestAnimationFrame((ts) => animateFnRef.current?.(ts));
    }

    return () => {
      window.removeEventListener("resize", updateTrackWidth);
      if (animationRef.current)  cancelAnimationFrame(animationRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (hoverResumeRef.current)   clearTimeout(hoverResumeRef.current);
      if (momentumRef.current)   cancelAnimationFrame(momentumRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (hoverResumeRef.current) {
      clearTimeout(hoverResumeRef.current);
      hoverResumeRef.current = null;
    }
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    isDraggingRef.current = true;
    isPausedRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    scrollStartRef.current = scrollXRef.current;
    lastMoveTimeRef.current = performance.now();
    lastMoveXRef.current = clientX;
    velocityRef.current = 0;
    clickStartRef.current = { x: clientX, y: clientY, time: performance.now() };
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current) return;
      const now = performance.now();
      const dt = now - lastMoveTimeRef.current;
      const dx = clientX - lastMoveXRef.current;
      if (dt > 0) velocityRef.current = dx / dt;
      lastMoveTimeRef.current = now;
      lastMoveXRef.current = clientX;

      const newX = normalize(scrollStartRef.current + (startXRef.current - clientX));
      scrollXRef.current = newX;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-${newX}px, 0, 0)`;
      }
    },
    [normalize],
  );

  const applyMomentum = useCallback(() => {
    const friction = 0.95;
    const minV = 0.05;

    const tick = () => {
      velocityRef.current *= friction;
      if (Math.abs(velocityRef.current) < minV) {
        velocityRef.current = 0;
        momentumRef.current = null;
        resumeTimeoutRef.current = setTimeout(() => {
          isPausedRef.current = false;
        }, 100);
        return;
      }
      const newX = normalize(scrollXRef.current - velocityRef.current * 16);
      scrollXRef.current = newX;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-${newX}px, 0, 0)`;
      }
      momentumRef.current = requestAnimationFrame(tick);
    };

    if (Math.abs(velocityRef.current) > minV) {
      momentumRef.current = requestAnimationFrame(tick);
    } else {
      resumeTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 100);
    }
  }, [normalize]);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    applyMomentum();
  }, [applyMomentum]);

  // Pause the carousel scroll so the chip stays under the cursor while hovering
  const handleChipHoverEnter = useCallback(() => {
    if (hoverResumeRef.current) {
      clearTimeout(hoverResumeRef.current);
      hoverResumeRef.current = null;
    }
    isPausedRef.current = true;
  }, []);

  const handleChipHoverLeave = useCallback(() => {
    hoverResumeRef.current = setTimeout(() => {
      if (!isDraggingRef.current) isPausedRef.current = false;
      hoverResumeRef.current = null;
    }, 350);
  }, []);

  const isClick = useCallback((clientX: number, clientY: number) => {
    const start = clickStartRef.current;
    if (!start) return false;
    const dx = Math.abs(clientX - start.x);
    const dy = Math.abs(clientY - start.y);
    const dt = performance.now() - start.time;
    return dx < 10 && dy < 10 && dt < 300;
  }, []);

  const handleChipClick = useCallback(
    (category: ReadyPostCategory, clientX: number, clientY: number) => {
      if (disabled) {
        clickStartRef.current = null;
        return;
      }
      if (!isClick(clientX, clientY)) {
        clickStartRef.current = null;
        return;
      }
      clickStartRef.current = null;
      onPickCategory(category);
    },
    [disabled, isClick, onPickCategory],
  );

  return (
    <div className={`infinite-scroll-stable ${className}`} aria-label={t.readyPosts.ariaLabel}>
      <div
        ref={containerRef}
        className="interactive-scroll-container"
        onMouseDown={(e) => {
          e.preventDefault();
          handleStart(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => {
          if (isDraggingRef.current) handleEnd();
        }}
        onTouchStart={(e) => {
          const t0 = e.touches[0];
          handleStart(t0.clientX, t0.clientY);
        }}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div ref={trackRef} className="interactive-scroll-track">
          {tripled.map((category, idx) => {
            const label =
              (t.readyPosts.categories as Record<string, string>)[category] ?? category;

            return (
              <CarouselChip
                key={`${category}-${idx}`}
                category={category}
                disabled={disabled}
                isDragging={isDragging}
                label={label}
                onChipClick={handleChipClick}
                onHoverEnter={handleChipHoverEnter}
                onHoverLeave={handleChipHoverLeave}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
