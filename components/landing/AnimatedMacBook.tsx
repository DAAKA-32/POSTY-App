"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import gsap from "gsap";

// Screenshots displayed in the MacBook screen carousel
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
 * AnimatedMacBook - Premium 3D MacBook with GSAP-powered cinematic animation
 *
 * Animation sequence:
 * 1. MacBook starts FAR above viewport (dramatic entrance)
 * 2. MacBook descends to mid-height position
 * 3. Lid opens at mid-height
 * 4. MacBook continues descent to final position (lid stays open)
 * 5. Screen content reveals after settling
 *
 * Features:
 * - Realistic MacBook Pro proportions
 * - GSAP physics-based animations
 * - Stylized aluminum base
 * - Mobile-optimized with reduced motion support
 */
export default function AnimatedMacBook({
  isVisible,
  screenImage = "/macimg.png",
  onAnimationComplete,
  hasAlreadyAnimated = false,
}: AnimatedMacBookProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Track when lid starts opening - hides front face elements until lid begins to open
  const [lidIsOpening, setLidIsOpening] = useState(false);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Internal ref to track animation within this component instance
  const hasAnimatedOnce = useRef(false);

  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null);
  const macbookRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const perspectiveRef = useRef<HTMLDivElement>(null);
  const screenLightRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carousel auto-advance — starts only after screen content is revealed
  useEffect(() => {
    if (!showContent) return;
    carouselTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SCREEN_IMAGES.length);
    }, CAROUSEL_INTERVAL);
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [showContent]);

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
      // Swipe left → next
      goToSlide((currentSlide + 1) % SCREEN_IMAGES.length);
    } else if (touchDeltaX.current > threshold) {
      // Swipe right → prev
      goToSlide((currentSlide - 1 + SCREEN_IMAGES.length) % SCREEN_IMAGES.length);
    }
  }, [currentSlide, goToSlide]);

  const handleAnimationComplete = useCallback(() => {
    // Mark animation as completed so it won't replay on tab switch
    hasAnimatedOnce.current = true;
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const shouldSimplify = prefersReducedMotion || isMobile;

  // GSAP Animation sequence
  useEffect(() => {
    if (!isVisible) return;

    // ================================================================
    // SKIP ANIMATION IF ALREADY PLAYED - Show final state immediately
    // Uses parent state (hasAlreadyAnimated) OR internal ref (hasAnimatedOnce)
    // ================================================================
    if (hasAlreadyAnimated || hasAnimatedOnce.current) {
      // Set final state immediately without animation
      setShowContent(true);
      setLidIsOpening(true);

      // Set elements to their final positions
      gsap.set(macbookRef.current, { y: 0, opacity: 1, scale: 1, filter: "blur(0px)" });
      gsap.set(lidRef.current, { rotateX: 0 });
      gsap.set(glowRef.current, { scale: 1, opacity: 1 });
      gsap.set(perspectiveRef.current, { perspectiveOrigin: "50% 85%" });
      gsap.set(screenLightRef.current, { opacity: 1 });
      gsap.set(shadowRef.current, { scaleX: 1 });

      // Trigger callback immediately
      handleAnimationComplete();
      return;
    }

    // Reset states for first animation
    setShowContent(false);
    setLidIsOpening(false);

    const ctx = gsap.context(() => {
      // ================================================================
      // INITIAL STATES - MacBook visible at top, descends dramatically
      // ================================================================

      // Calculate positions - Start FULLY off-screen for cinematic entrance
      const viewportHeight = window.innerHeight;
      // Start position: Completely above viewport
      const startY = shouldSimplify ? -(viewportHeight * 0.5) : -(viewportHeight + 100);
      // Mid position: Where lid opens (slightly above final)
      const midY = shouldSimplify ? -60 : -80;
      // Final position
      const finalY = 0;
      const startScale = shouldSimplify ? 0.96 : 0.85;

      gsap.set(macbookRef.current, {
        y: startY,
        opacity: 1,
        scale: startScale,
        filter: "blur(0px)"
      });
      gsap.set(lidRef.current, {
        rotateX: -90, // Fully closed
        transformOrigin: "center bottom"
      });
      gsap.set(glowRef.current, { scale: 0.3, opacity: 0 });
      gsap.set(perspectiveRef.current, { perspectiveOrigin: "50% 58%" });
      gsap.set(screenLightRef.current, { opacity: 0 });
      gsap.set(shadowRef.current, { scaleX: 0.7 });

      // ================================================================
      // TIMELINE - FAST & IMPACTFUL: Descend → Open → Settle → Reveal
      // Optimized for immediate wow effect (~1.2s total vs ~2.5s before)
      // ================================================================
      const tl = gsap.timeline({
        defaults: { ease: "power4.out" }, // Snappier default easing
        onComplete: handleAnimationComplete,
      });

      // ========================================
      // PHASE 1: DESCENT - Cinematic arrival from off-screen
      // ========================================
      tl.to(macbookRef.current, {
        y: midY,
        scale: shouldSimplify ? 0.96 : 0.92,
        duration: shouldSimplify ? 0.5 : 0.75,
        ease: "power3.out",
      });

      // Ambient glow appears during descent
      tl.to(glowRef.current, {
        scale: 0.6,
        opacity: 0.4,
        duration: shouldSimplify ? 0.4 : 0.5,
        ease: "power2.out",
      }, "-=0.5");

      // ========================================
      // PHASE 2: LID OPENS - Snappy opening (0.4s)
      // ========================================
      // Minimal pause
      tl.to({}, { duration: 0.02 });

      // Reveal front face immediately
      tl.call(() => setLidIsOpening(true));

      // Lid opens with snappy animation
      tl.to(lidRef.current, {
        rotateX: 0,
        duration: shouldSimplify ? 0.3 : 0.45,
        ease: shouldSimplify ? "power3.out" : "back.out(1.5)",
      });

      // Perspective shifts from edge-on to "looking from below" as lid opens
      tl.to(perspectiveRef.current, {
        perspectiveOrigin: "50% 85%",
        duration: shouldSimplify ? 0.3 : 0.45,
        ease: "power2.inOut",
      }, "<");

      // Screen light illuminates keyboard surface as lid opens
      tl.to(screenLightRef.current, {
        opacity: 1,
        duration: shouldSimplify ? 0.3 : 0.5,
        ease: "power2.out",
      }, "<");

      // Shadow widens as device opens up (larger footprint when open)
      tl.to(shadowRef.current, {
        scaleX: 1,
        duration: shouldSimplify ? 0.3 : 0.4,
        ease: "power2.out",
      }, "<");

      // ========================================
      // PHASE 3: SETTLE - Quick landing (0.4s)
      // ========================================
      tl.to(macbookRef.current, {
        y: finalY,
        scale: 1,
        duration: shouldSimplify ? 0.35 : 0.45,
        ease: "power2.out",
      }, "-=0.25");

      // Glow reaches full intensity
      tl.to(glowRef.current, {
        scale: 1,
        opacity: 1,
        duration: shouldSimplify ? 0.3 : 0.4,
        ease: "power2.out",
      }, "-=0.4");

      // ========================================
      // PHASE 4: CONTENT - Instant reveal
      // ========================================
      tl.call(() => setShowContent(true), [], "-=0.25");

    }, containerRef);

    return () => ctx.revert();
  }, [isVisible, shouldSimplify, handleAnimationComplete, hasAlreadyAnimated]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* MacBook Container */}
      <div
        ref={macbookRef}
        className="relative w-full max-w-[1084px] mx-auto"
      >
        {/* Ambient glow */}
        <div
          ref={glowRef}
          className="absolute inset-0 -z-10"
          style={{ opacity: 0 }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-br from-[#F8935D]/25 via-[#F76B54]/20 to-[#F8935D]/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-white/20 rounded-full blur-[60px]" />
        </div>

        {/* MacBook 3D Container */}
        <div
          ref={perspectiveRef}
          className="relative mx-auto"
          style={{
            perspective: "2200px",
            perspectiveOrigin: "50% 58%",
          }}
        >
          {/* ============================================================ */}
          {/* MacBook Screen (Lid) - 3D with front and back faces          */}
          {/* ============================================================ */}
          <div
            ref={lidRef}
            className="relative"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom",
            }}
          >
            {/* ========== LID BACK FACE (Aluminum exterior with Apple logo) ========== */}
            <div
              className="absolute inset-0 rounded-t-[12px] sm:rounded-t-[16px] md:rounded-t-[20px]"
              style={{
                transform: "rotateX(180deg)",
                backfaceVisibility: "hidden",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Aluminum body with premium finish */}
              <div className="relative w-full h-full bg-gradient-to-b from-[#e8e8ed] via-[#d8d8dd] to-[#c8c8cd] rounded-t-[12px] sm:rounded-t-[16px] md:rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                {/* Top chamfered edge highlight */}
                <div className="absolute top-0 inset-x-0 h-[2px] sm:h-[3px] bg-gradient-to-b from-[#f5f5f7] to-[#e8e8ed] rounded-t-[12px] sm:rounded-t-[16px] md:rounded-t-[20px]" />

                {/* Subtle brushed aluminum texture via gradient */}
                <div className="absolute inset-[3px] sm:inset-[4px] md:inset-[5px] rounded-t-[10px] sm:rounded-t-[13px] md:rounded-t-[16px] bg-gradient-to-br from-[#d4d4d9] via-[#dcdce1] to-[#d0d0d5] opacity-60" />

                {/* Apple Logo - Centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="text-[#a0a0a5] opacity-80"
                    style={{
                      transform: "rotateX(180deg)", // Flip so it reads correctly when lid is closed
                    }}
                  >
                    {/* Apple logo SVG */}
                    <svg
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                </div>

                {/* Subtle reflection streak */}
                <div className="absolute top-[20%] left-[10%] right-[60%] h-[30%] bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-full blur-xl" />

                {/* Edge shadows for depth */}
                <div className="absolute inset-0 rounded-t-[12px] sm:rounded-t-[16px] md:rounded-t-[20px] shadow-[inset_2px_0_4px_rgba(0,0,0,0.05),inset_-2px_0_4px_rgba(0,0,0,0.05)]" />

                {/* Bottom edge (hinge side) */}
                <div className="absolute bottom-0 inset-x-0 h-[3px] sm:h-[4px] md:h-[5px] bg-gradient-to-b from-[#b8b8bd] to-[#a0a0a5] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" />
              </div>
            </div>

            {/* ========== LID FRONT FACE (Screen side) ========== */}
            {/* Hidden when lid is closed to prevent visual artifacts, revealed when opening */}
            {/* Screen outer frame - Aluminum housing */}
            <div
              className={`relative bg-gradient-to-b from-[#e8e8ed] via-[#d4d4d9] to-[#c0c0c5] rounded-t-[12px] sm:rounded-t-[16px] md:rounded-t-[20px] p-[3px] sm:p-[4px] md:p-[5px] shadow-[0_-2px_10px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] transition-opacity duration-200 ${
                lidIsOpening ? "opacity-100" : "opacity-0"
              }`}
              style={{ backfaceVisibility: "hidden" }}
            >

              {/* Screen bezel - Dark frame */}
              <div className="relative bg-gradient-to-b from-[#1d1d1f] to-[#0d0d0d] rounded-[10px] sm:rounded-[13px] md:rounded-[16px] p-[8px] sm:p-[10px] md:p-[14px] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">

                {/* Camera notch - Centered */}
                <div className="absolute top-[6px] sm:top-[8px] md:top-[10px] left-1/2 -translate-x-1/2 z-20">
                  <div className="relative flex items-center justify-center">
                    <div className="w-[6px] h-[6px] sm:w-[7px] sm:h-[7px] md:w-[8px] md:h-[8px] rounded-full bg-[#1a1a1a] border border-[#333] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
                      <div className="absolute inset-[1.5px] rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a]" />
                      {!shouldSimplify && showContent && (
                        <div className="absolute inset-[2px] rounded-full bg-[#1a472a]/40 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Screen display area - Widescreen 16:9 for elongated look */}
                <div className="relative aspect-[16/9] bg-[#000] rounded-[4px] sm:rounded-[6px] md:rounded-[8px] overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">

                  {/* Boot glow effect - Quick fade out */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-[#F8935D]/15 via-transparent to-[#F76B54]/15 transition-opacity duration-200 ${
                      showContent ? "opacity-0" : "opacity-100"
                    }`}
                  />

                  {/* Screen content - Carousel with brightness bloom (screen "powers on") */}
                  <div
                    className={`absolute inset-0 transition-all duration-[400ms] ease-out ${
                      showContent ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
                    }`}
                    style={!shouldSimplify ? {
                      filter: showContent ? 'brightness(1)' : 'brightness(1.3)',
                    } : undefined}
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
                            className="object-cover object-top"
                            priority={i === 0}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Navigation arrows — desktop only, appear on hover */}
                    {showContent && (
                      <div className="absolute inset-0 z-10 hidden sm:flex items-center justify-between px-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => goToSlide((currentSlide - 1 + SCREEN_IMAGES.length) % SCREEN_IMAGES.length)}
                          className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all"
                          aria-label="Image precedente"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => goToSlide((currentSlide + 1) % SCREEN_IMAGES.length)}
                          className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all"
                          aria-label="Image suivante"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Dot indicators */}
                    {showContent && (
                      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
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
                    )}

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
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/[0.02] pointer-events-none" />

                    {/* Edge vignette */}
                    <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] pointer-events-none" />
                  </div>

                  {/* Loading shimmer */}
                  {!showContent && !shouldSimplify && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom edge reflection on lid */}
              <div className="absolute bottom-[3px] sm:bottom-[4px] md:bottom-[5px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
          </div>

          {/* ============================================================ */}
          {/* MacBook Base - Premium Aluminum with Realistic Proportions    */}
          {/* ============================================================ */}
          <div className="relative">
            {/* Hinge mechanism - Realistic barrel hinge */}
            <div className="relative h-[4px] sm:h-[5px] md:h-[6px] mx-[2%]">
              {/* Hinge barrel */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#3a3a3c] via-[#2a2a2c] to-[#1a1a1c] rounded-t-sm">
                {/* Hinge highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#555] to-transparent" />
                {/* Hinge shadow line */}
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-[#0a0a0c]" />
              </div>
            </div>

            {/* Base body - MacBook Pro style aluminum with chamfered edge */}
            <div className="relative mx-[1%]">
              {/* Top chamfered edge - the signature MacBook bevel */}
              <div className="h-[2px] sm:h-[3px] md:h-[4px] bg-gradient-to-b from-[#d8d8dd] to-[#c8c8cd] rounded-t-[1px]">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-[#e8e8ed] via-[#f0f0f3] to-[#e8e8ed]" />
              </div>

              {/* Main aluminum body */}
              <div className="relative bg-gradient-to-b from-[#e0e0e5] via-[#d6d6db] to-[#c6c6cb] h-[18px] sm:h-[24px] md:h-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                {/* Subtle brushed aluminum texture */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

                {/* Notch cutout for opening - Apple-style finger recess */}
                <div className="absolute -top-[2px] sm:-top-[3px] md:-top-[4px] left-1/2 -translate-x-1/2 w-[70px] sm:w-[90px] md:w-[120px] h-[6px] sm:h-[8px] md:h-[10px] bg-gradient-to-b from-[#b8b8bd] to-[#c8c8cd] rounded-b-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]">
                  {/* Inner notch highlight */}
                  <div className="absolute inset-x-[15%] bottom-[2px] h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                {/* Side edge shadows for 3D depth */}
                <div className="absolute left-0 top-0 bottom-0 w-[6px] sm:w-[8px] md:w-[10px] bg-gradient-to-r from-[#b8b8bd] to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-[6px] sm:w-[8px] md:w-[10px] bg-gradient-to-l from-[#b8b8bd] to-transparent" />

                {/* Screen light cast onto keyboard — simulates display illuminating the surface */}
                <div
                  ref={screenLightRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at 50% -30%, rgba(200,215,240,0.12) 0%, transparent 65%)',
                    opacity: 0,
                  }}
                />
              </div>

              {/* Front edge lip - the thin edge you see when looking at MacBook */}
              <div className="h-[3px] sm:h-[4px] md:h-[5px] bg-gradient-to-b from-[#b0b0b5] to-[#9a9a9f] rounded-b-[8px] sm:rounded-b-[10px] md:rounded-b-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                {/* Bottom chamfer highlight */}
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#a8a8ad] to-transparent rounded-b-[8px] sm:rounded-b-[10px] md:rounded-b-[12px]" />
              </div>
            </div>

            {/* Base shadow - realistic multi-layer shadow system */}
            <div ref={shadowRef} className="absolute -bottom-4 sm:-bottom-5 md:-bottom-6 left-[5%] right-[5%] h-6 sm:h-8 md:h-10 bg-black/12 blur-2xl rounded-[50%]" />
            <div className="absolute -bottom-2 sm:-bottom-2.5 left-[12%] right-[12%] h-3 sm:h-4 bg-black/8 blur-lg rounded-[50%]" />
          </div>
        </div>

      </div>

    </div>
  );
}
