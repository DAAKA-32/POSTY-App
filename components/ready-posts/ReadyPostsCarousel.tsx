"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Pastel pill backgrounds matching the legacy chip aesthetic.
const CHIP_TONES: Record<ReadyPostCategory, { bg: string; border: string }> = {
  storytelling: {
    bg: "bg-[#F8935D]/8 dark:bg-[#F8935D]/12",
    border: "border-[#F8935D]/30 dark:border-[#F8935D]/35",
  },
  tips: {
    bg: "bg-cyan-50 dark:bg-cyan-500/12",
    border: "border-cyan-200 dark:border-cyan-500/35",
  },
  controversial: {
    bg: "bg-violet-50 dark:bg-violet-500/12",
    border: "border-violet-200 dark:border-violet-500/35",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-500/12",
    border: "border-emerald-200 dark:border-emerald-500/35",
  },
  lesson: {
    bg: "bg-[#F8935D]/8 dark:bg-[#F8935D]/12",
    border: "border-[#F8935D]/30 dark:border-[#F8935D]/35",
  },
  question: {
    bg: "bg-cyan-50 dark:bg-cyan-500/12",
    border: "border-cyan-200 dark:border-cyan-500/35",
  },
};

interface ReadyPostsCarouselProps {
  disabled?: boolean;
  /** Fired when a chip is clicked. Plan gating (Max vs Free/Pro) is handled by the parent's category browser. */
  onPickCategory: (category: ReadyPostCategory) => void;
  className?: string;
}

/**
 * ReadyPostsCarousel — infinite horizontal chip carousel.
 *
 * Each chip represents a post category (Storytelling, Tips, Engagement…).
 * Clicking a chip surfaces the ready-to-publish posts for that category in
 * the parent's browser modal. The chips themselves are not plan-gated; the
 * lock kicks in inside the browser for Free / Pro users.
 *
 * The auto-scroll loop uses the same battle-tested RAF pattern as the
 * legacy carousel: refs drive the animation, DOM transforms apply directly,
 * and the track triplicates the dataset to wrap seamlessly.
 */
export default function ReadyPostsCarousel({
  disabled = false,
  onPickCategory,
  className = "",
}: ReadyPostsCarouselProps) {
  const { t } = useLanguage();

  const tripled = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const scrollXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const momentumRef = useRef<number | null>(null);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

      const movement = 60 * dt;
      const newX = normalize(scrollXRef.current + movement);
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
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

      const diff = startXRef.current - clientX;
      const newX = normalize(scrollStartRef.current + diff);
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
          setHoveredId(null);
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
            const chipId = `${category}-${idx}`;
            const style = CATEGORY_STYLES[category];
            const tone = CHIP_TONES[category];
            const isHovered = hoveredId === chipId;
            const label =
              (t.readyPosts.categories as Record<string, string>)[category] ?? category;

            return (
              <button
                key={chipId}
                type="button"
                disabled={disabled}
                onClick={(e) => handleChipClick(category, e.clientX, e.clientY)}
                onMouseEnter={() => !disabled && setHoveredId(chipId)}
                onMouseLeave={() => setHoveredId(null)}
                draggable={false}
                className={`
                  template-chip-interactive
                  flex-shrink-0 px-4 py-2.5 rounded-xl border-2
                  ${tone.bg} ${tone.border}
                  flex items-center gap-2
                  select-none
                  transition-all duration-200
                  ${disabled
                    ? "cursor-not-allowed opacity-90"
                    : isHovered
                      ? `scale-105 shadow-lg ring-2 ${style.ring}`
                      : "scale-100"
                  }
                  ${!disabled ? "hover:shadow-md" : ""}
                `}
              >
                <span className="text-lg pointer-events-none">{style.icon}</span>
                <span
                  className={`
                    text-xs font-medium whitespace-nowrap pointer-events-none
                    transition-colors duration-200
                    ${isHovered && !disabled
                      ? "text-gray-900 dark:text-white font-semibold"
                      : "text-gray-700 dark:text-text-secondary"
                    }
                  `}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
