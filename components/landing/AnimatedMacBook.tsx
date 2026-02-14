"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import Image from "next/image";

// Screenshots displayed in the browser screen carousel
const SCREEN_IMAGES = [
  "/capture1.png",
  "/capture2.png",
  "/capture3.png",
  "/capture4.png",
  "/capture5.png",
];

const CAROUSEL_INTERVAL = 4000; // Auto-advance every 4s

interface AnimatedMacBookProps {
  isVisible: boolean;
  screenImage?: string;
  onAnimationComplete?: () => void;
  /** If true, skip animation and show final state immediately (from parent state) */
  hasAlreadyAnimated?: boolean;
}

/**
 * AnimatedMacBook - 3D Perspective Tilt Reveal (prosp.ai style)
 *
 * The mockup starts tilted back (rotateX) and animates to flat when visible.
 * Clean browser window frame with screenshot carousel.
 */
export default function AnimatedMacBook({
  isVisible,
  onAnimationComplete,
}: AnimatedMacBookProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carousel auto-advance — starts when visible
  useEffect(() => {
    if (!isVisible) return;
    carouselTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SCREEN_IMAGES.length);
    }, CAROUSEL_INTERVAL);
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [isVisible]);

  // Reset auto-advance timer on manual navigation
  const resetCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SCREEN_IMAGES.length);
    }, CAROUSEL_INTERVAL);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    resetCarouselTimer();
  }, [resetCarouselTimer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const threshold = 50;
    if (touchDeltaX.current < -threshold) {
      goToSlide((currentSlide + 1) % SCREEN_IMAGES.length);
    } else if (touchDeltaX.current > threshold) {
      goToSlide((currentSlide - 1 + SCREEN_IMAGES.length) % SCREEN_IMAGES.length);
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

  return (
    <div className="relative w-full">
      {/* Ambient glow */}
      <div className="absolute -inset-8 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-br from-[#F8935D]/15 via-[#F76B54]/10 to-[#F8935D]/15 rounded-full blur-[80px]" />
      </div>

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

            {/* Screen content area */}
            <div
              className="relative aspect-[16/9] bg-white overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Carousel slides */}
              <div
                className="absolute inset-0 flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {SCREEN_IMAGES.map((src, i) => (
                  <div key={src} className="relative w-full h-full flex-shrink-0">
                    <Image
                      src={src}
                      alt={`Posty - Capture ${i + 1}`}
                      fill
                      className="object-contain"
                      priority={i === 0}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation arrows — desktop only, appear on hover */}
              <div className="absolute inset-0 z-10 hidden sm:flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => goToSlide((currentSlide - 1 + SCREEN_IMAGES.length) % SCREEN_IMAGES.length)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all"
                  aria-label="Image precedente"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => goToSlide((currentSlide + 1) % SCREEN_IMAGES.length)}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all"
                  aria-label="Image suivante"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Dot indicators */}
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                {SCREEN_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? "w-5 h-1.5 bg-white/90"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Capture ${i + 1}`}
                  />
                ))}
              </div>

              {/* Glass reflection — diagonal light streak */}
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
