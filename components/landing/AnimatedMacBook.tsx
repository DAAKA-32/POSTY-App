"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MOCKUP_SCREENS } from "./MockupScreens";

const SLIDE_COUNT = MOCKUP_SCREENS.length;
const CAROUSEL_INTERVAL = 5000; // Auto-advance every 5s
const SWIPE_THRESHOLD = 40; // px — minimum distance for a swipe to register

interface AnimatedMacBookProps {
  isVisible: boolean;
  screenImage?: string;
  onAnimationComplete?: () => void;
  /** If true, skip animation and show final state immediately (from parent state) */
  hasAlreadyAnimated?: boolean;
}

/**
 * AnimatedMacBook — Browser window frame with realistic app mockup carousel.
 * Displays live React components instead of static screenshots.
 * Fully responsive: arrows, swipe, and dots adapt to mobile/tablet/desktop.
 */
export default function AnimatedMacBook({
  isVisible,
  onAnimationComplete,
}: AnimatedMacBookProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe hint — show once on mobile
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Detect device type on mount and resize
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 640);
      setIsTablet(w >= 640 && w < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Show swipe hint on mobile after a short delay, then hide after 3s
  useEffect(() => {
    if (!isMobile || !isVisible) return;
    const showTimer = setTimeout(() => setShowSwipeHint(true), 1500);
    const hideTimer = setTimeout(() => setShowSwipeHint(false), 4500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isMobile, isVisible]);

  // Carousel auto-advance — starts when visible, pauses during drag
  useEffect(() => {
    if (!isVisible || isDragging) return;
    carouselTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_COUNT);
    }, CAROUSEL_INTERVAL);
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [isVisible, isDragging]);

  // Reset auto-advance timer on manual navigation
  const resetCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_COUNT);
    }, CAROUSEL_INTERVAL);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    resetCarouselTimer();
    // Dismiss swipe hint on first interaction
    setShowSwipeHint(false);
  }, [resetCarouselTimer]);

  // --- Touch handling with direction lock ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Determine swipe direction on first significant move
    if (isHorizontalSwipe.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
    }

    // Only track horizontal swipes — let vertical scroll through
    if (isHorizontalSwipe.current) {
      e.preventDefault(); // Prevent page scroll during horizontal swipe
      touchDeltaX.current = dx;

      // Apply rubber-band drag offset for visual feedback
      const containerWidth = containerRef.current?.offsetWidth || 375;
      const clampedDrag = Math.max(-containerWidth * 0.3, Math.min(containerWidth * 0.3, dx));
      setDragOffset(clampedDrag);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setDragOffset(0);

    if (!isHorizontalSwipe.current) return;

    if (touchDeltaX.current < -SWIPE_THRESHOLD) {
      goToSlide((currentSlide + 1) % SLIDE_COUNT);
    } else if (touchDeltaX.current > SWIPE_THRESHOLD) {
      goToSlide((currentSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT);
    }
  }, [currentSlide, goToSlide]);

  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const shouldSimplify = prefersReducedMotion || isMobile;

  // Trigger callback immediately — no reveal animation
  useEffect(() => {
    if (isVisible) {
      handleAnimationComplete();
    }
  }, [isVisible, handleAnimationComplete]);

  // Compute carousel transform with drag offset
  const carouselTransform = isDragging
    ? `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`
    : `translateX(-${currentSlide * 100}%)`;

  return (
    <div className="relative w-full">
      {/* Container */}
      <div className="relative w-full max-w-[1084px] mx-auto">
        <div>
          {/* Browser window frame */}
          <div className="relative bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-gray-400/20 border border-gray-200/60">

            {/* Title bar */}
            <div className="flex items-center justify-between px-4 md:px-5 py-2.5 md:py-3 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
              {/* Traffic light dots */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#FF5F57] shadow-sm shadow-[#FF5F57]/30" />
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#FEBC2E] shadow-sm shadow-[#FEBC2E]/30" />
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#28C840] shadow-sm shadow-[#28C840]/30" />
              </div>

              {/* URL bar */}
              <div className="flex-1 mx-4 md:mx-8">
                <div className="bg-gray-100/80 rounded-lg px-3 py-1 md:py-1.5 flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[11px] md:text-xs text-gray-400 font-medium truncate">
                    app.posty.ai
                  </span>
                </div>
              </div>

              {/* Spacer for symmetry */}
              <div className="w-[52px] md:w-[62px]" />
            </div>

            {/* Screen content area — taller on mobile for better readability */}
            <div
              ref={containerRef}
              className="relative aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/10] bg-[#FAFAF8] overflow-hidden touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Carousel slides — React component mockups */}
              <div
                className={`absolute inset-0 flex ${
                  isDragging ? "" : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                }`}
                style={{ transform: carouselTransform }}
              >
                {MOCKUP_SCREENS.map((screen) => (
                  <div key={screen.id} className="relative w-full h-full flex-shrink-0">
                    <screen.component />
                  </div>
                ))}
              </div>

              {/* Navigation arrows — MOBILE: always visible, small, semi-transparent */}
              {/* On small screens, arrows sit outside the content flow at edges */}
              <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-1.5 sm:pl-2 lg:pl-3 sm:hidden">
                <button
                  onClick={() => goToSlide((currentSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT)}
                  className="w-7 h-7 rounded-full bg-white/80 shadow-md border border-gray-200/50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                  aria-label="Ecran precedent"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-1.5 sm:pr-2 lg:pr-3 sm:hidden">
                <button
                  onClick={() => goToSlide((currentSlide + 1) % SLIDE_COUNT)}
                  className="w-7 h-7 rounded-full bg-white/80 shadow-md border border-gray-200/50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                  aria-label="Ecran suivant"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Navigation arrows — TABLET: always visible, medium size */}
              <div className="absolute inset-y-0 left-0 z-10 hidden sm:flex lg:hidden items-center pl-2.5">
                <button
                  onClick={() => goToSlide((currentSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT)}
                  className="w-9 h-9 rounded-full bg-white/90 shadow-lg border border-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 active:scale-95 transition-all"
                  aria-label="Ecran precedent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 z-10 hidden sm:flex lg:hidden items-center pr-2.5">
                <button
                  onClick={() => goToSlide((currentSlide + 1) % SLIDE_COUNT)}
                  className="w-9 h-9 rounded-full bg-white/90 shadow-lg border border-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 active:scale-95 transition-all"
                  aria-label="Ecran suivant"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Navigation arrows — DESKTOP: appear on hover (unchanged) */}
              <div className="absolute inset-0 z-10 hidden lg:flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => goToSlide((currentSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all"
                  aria-label="Ecran precedent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => goToSlide((currentSlide + 1) % SLIDE_COUNT)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all"
                  aria-label="Ecran suivant"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Slide label + dot indicators — responsive sizing */}
              <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 sm:gap-3 bg-black/30 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5">
                <span className="text-[9px] sm:text-[10px] text-white/80 font-medium">
                  {MOCKUP_SCREENS[currentSlide].label}
                </span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {MOCKUP_SCREENS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? "w-4 sm:w-5 h-1.5 bg-white/90"
                          : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                      }`}
                      aria-label={MOCKUP_SCREENS[i].label}
                    />
                  ))}
                </div>
              </div>

              {/* Swipe hint — mobile only, shown briefly */}
              <AnimatePresence>
                {showSwipeHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none sm:hidden"
                  >
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
                      <motion.svg
                        animate={{ x: [0, -6, 6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4-4m-4 4l4 4" />
                      </motion.svg>
                      Swipez pour naviguer
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Glass reflection — diagonal light streak (desktop only) */}
              {!shouldSimplify && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: 'linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.07) 44%, rgba(255,255,255,0.04) 46%, transparent 48%, transparent 100%)',
                  }}
                />
              )}

              {/* Screen reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/[0.02] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Drop shadow under the frame */}
      <div className="absolute -bottom-4 left-[8%] right-[8%] h-8 bg-black/8 blur-2xl rounded-[50%] pointer-events-none" />
    </div>
  );
}
