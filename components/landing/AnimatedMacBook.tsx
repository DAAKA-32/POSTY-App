"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface AnimatedMacBookProps {
  isVisible: boolean;
  screenImage?: string;
  onAnimationComplete?: () => void;
}

/**
 * AnimatedMacBook - Premium 3D MacBook with cinematic reveal animation
 *
 * Animation sequence:
 * 1. MacBook rises from below the viewport
 * 2. Text appears progressively above
 * 3. MacBook lid opens with 3D perspective
 * 4. Screen content reveals with glow effect
 * 5. Floating badges appear with stagger
 *
 * Features:
 * - Cinematic rising animation from bottom
 * - Progressive text reveal
 * - Realistic 3D perspective with CSS transforms
 * - Smooth lid opening animation using Framer Motion
 * - Screen content reveal with glow effects
 * - Floating feature badges
 * - Mobile-optimized with reduced motion support
 */
export default function AnimatedMacBook({
  isVisible,
  screenImage = "/macimg.png",
  onAnimationComplete,
}: AnimatedMacBookProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasRisen, setHasRisen] = useState(false);
  const [showText, setShowText] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Memoize callback to avoid dependency issues
  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  // Use simplified/faster timings on mobile
  const shouldSimplify = prefersReducedMotion || isMobile;

  // Cinematic animation sequence
  useEffect(() => {
    if (isVisible) {
      // Reset all states
      setHasRisen(false);
      setShowText(false);
      setIsOpen(false);
      setShowContent(false);
      setShowBadges(false);

      // Staggered cinematic sequence
      const timings = shouldSimplify
        ? { rise: 0, text: 100, open: 300, content: 500, badges: 700 }
        : { rise: 100, text: 400, open: 900, content: 1600, badges: 2000 };

      const riseTimer = setTimeout(() => setHasRisen(true), timings.rise);
      const textTimer = setTimeout(() => setShowText(true), timings.text);
      const openTimer = setTimeout(() => setIsOpen(true), timings.open);
      const contentTimer = setTimeout(() => setShowContent(true), timings.content);
      const badgesTimer = setTimeout(() => {
        setShowBadges(true);
        handleAnimationComplete();
      }, timings.badges);

      return () => {
        clearTimeout(riseTimer);
        clearTimeout(textTimer);
        clearTimeout(openTimer);
        clearTimeout(contentTimer);
        clearTimeout(badgesTimer);
      };
    }
  }, [isVisible, shouldSimplify, handleAnimationComplete]);

  // Premium easing curves - cinematic feel
  const cinematicEase = [0.16, 1, 0.3, 1] as const;
  const smoothEase = [0.22, 1, 0.36, 1] as const;

  // Animation durations
  const riseDuration = shouldSimplify ? 0.4 : 0.9;
  const lidDuration = shouldSimplify ? 0.5 : 1.2;
  const contentDuration = shouldSimplify ? 0.3 : 0.8;

  return (
    <div className="relative w-full">
      {/* ================================================================ */}
      {/* Hero Text - Appears progressively above MacBook                 */}
      {/* ================================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{
          opacity: showText ? 1 : 0,
          y: showText ? 0 : 30,
        }}
        transition={{
          duration: shouldSimplify ? 0.4 : 0.7,
          ease: cinematicEase,
        }}
        className="text-center mb-8 md:mb-12"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
          Decouvrez Posty en action
        </h2>
        <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto">
          Une interface intuitive pour creer des posts LinkedIn qui convertissent
        </p>
      </motion.div>

      {/* ================================================================ */}
      {/* MacBook Container - Rising from bottom with 3D opening          */}
      {/* ================================================================ */}
      <motion.div
        initial={{ y: 150, opacity: 0 }}
        animate={{
          y: hasRisen ? 0 : 150,
          opacity: hasRisen ? 1 : 0,
        }}
        transition={{
          duration: riseDuration,
          ease: cinematicEase,
        }}
        className="relative w-full max-w-4xl mx-auto"
      >
        {/* Ambient glow - intensifies as MacBook opens */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: isOpen ? 1 : 0,
            scale: isOpen ? 1 : 0.8,
          }}
          transition={{ duration: lidDuration, ease: cinematicEase }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-gradient-to-br from-[#F8935D]/20 via-[#F76B54]/15 to-[#F8935D]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-gradient-to-br from-white/30 to-transparent rounded-full blur-[80px]" />
        </motion.div>

        {/* MacBook 3D Container with perspective */}
        <div
          className="relative"
          style={{
            perspective: "2000px",
            perspectiveOrigin: "50% 100%",
          }}
        >
          {/* ============================================================ */}
          {/* MacBook Screen (Lid) - 3D rotation animation                 */}
          {/* ============================================================ */}
          <motion.div
            initial={{ rotateX: -85 }}
            animate={{
              rotateX: isOpen ? 0 : -85,
            }}
            transition={{
              duration: lidDuration,
              ease: cinematicEase,
              delay: shouldSimplify ? 0 : 0.1,
            }}
            className="relative origin-bottom"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {/* Screen bezel (outer frame) - Apple-style design */}
            <div className="relative bg-gradient-to-b from-[#2D2D2D] via-[#1a1a1a] to-[#0d0d0d] rounded-t-[16px] sm:rounded-t-[20px] md:rounded-t-[28px] p-[6px] sm:p-[8px] md:p-[12px] shadow-2xl">
              {/* Inner screen bezel */}
              <div className="relative bg-[#0a0a0a] rounded-[10px] sm:rounded-[12px] md:rounded-[16px] overflow-hidden">
                {/* Camera notch - Apple style */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="w-[80px] sm:w-[100px] md:w-[140px] h-[16px] sm:h-[20px] md:h-[26px] bg-[#0a0a0a] rounded-b-2xl" />
                    <div className="absolute top-[5px] sm:top-[6px] md:top-[8px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] sm:w-[6px] sm:h-[6px] md:w-[8px] md:h-[8px] rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                      <div className="absolute inset-[1.5px] sm:inset-[2px] rounded-full bg-[#0d1117]" />
                      {!shouldSimplify && (
                        <motion.div
                          animate={{ opacity: [0.3, 0.8, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-[2px] sm:inset-[3px] rounded-full bg-[#00FF00]/20"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Screen content area */}
                <div className="relative aspect-[16/10] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]">
                  {/* Boot-up glow effect */}
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: showContent ? 0 : 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-br from-[#F8935D]/10 via-transparent to-[#F76B54]/10"
                  />

                  {/* Screen content (app screenshot) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{
                      opacity: showContent ? 1 : 0,
                      scale: showContent ? 1 : 1.02,
                    }}
                    transition={{
                      duration: contentDuration,
                      ease: smoothEase,
                    }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={screenImage}
                      alt="Posty - Interface de generation de posts LinkedIn"
                      fill
                      className="object-cover object-top"
                      priority
                    />

                    {/* Screen reflection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

                    {/* Subtle vignette */}
                    <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] pointer-events-none" />
                  </motion.div>

                  {/* Loading shimmer before content appears */}
                  {!showContent && !shouldSimplify && (
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                    />
                  )}
                </div>
              </div>

              {/* Bottom edge reflection */}
              <div className="absolute bottom-0 left-[10px] sm:left-[12px] right-[10px] sm:right-[12px] h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-[#3a3a3a] to-transparent" />
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* MacBook Base (Keyboard/Trackpad)                             */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hasRisen ? 1 : 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative"
          >
            {/* Base body */}
            <div className="relative bg-gradient-to-b from-[#2D2D2D] via-[#252525] to-[#1a1a1a] rounded-b-[10px] sm:rounded-b-[12px] md:rounded-b-[16px] h-[16px] sm:h-[20px] md:h-[28px] shadow-xl">
              {/* Top edge highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4a4a4a] to-transparent" />

              {/* Notch cutout for opening */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] sm:w-[80px] md:w-[120px] h-[3px] sm:h-[4px] md:h-[6px] bg-[#1a1a1a] rounded-b-full" />

              {/* Side shadows for depth */}
              <div className="absolute inset-0 rounded-b-[10px] sm:rounded-b-[12px] md:rounded-b-[16px] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.3)]" />
            </div>

            {/* Base shadow */}
            <div className="absolute -bottom-3 sm:-bottom-4 left-[5%] right-[5%] h-6 sm:h-8 bg-black/15 blur-xl rounded-full" />
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* Floating Feature Badges                                       */}
        {/* ============================================================ */}

        {/* Left badge - AI Optimized */}
        <motion.div
          initial={{ opacity: 0, x: -40, y: 20 }}
          animate={{
            opacity: showBadges ? 1 : 0,
            x: showBadges ? 0 : -40,
            y: showBadges ? 0 : 20,
          }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="absolute top-[8%] sm:top-[10%] -left-2 sm:left-0 md:left-2 lg:-left-4 xl:-left-8 z-10"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100/80 p-2.5 sm:p-3 md:p-4 max-w-[150px] sm:max-w-[170px] md:max-w-[200px]">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-gray-900">IA Optimisee</span>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 leading-relaxed">
              Posts generes en 30 secondes
            </p>
          </div>
        </motion.div>

        {/* Right badge - Engagement boost */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{
            opacity: showBadges ? 1 : 0,
            x: showBadges ? 0 : 40,
            y: showBadges ? 0 : 20,
          }}
          transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
          className="absolute bottom-[20%] sm:bottom-[22%] -right-2 sm:right-0 md:right-2 lg:-right-4 xl:-right-8 z-10"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100/80 p-2.5 sm:p-3 md:p-4 max-w-[150px] sm:max-w-[170px] md:max-w-[200px]">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center shadow-md shadow-[#F8935D]/30">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-gray-900">x3 Engagement</span>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 leading-relaxed">
              Optimise pour LinkedIn
            </p>
          </div>
        </motion.div>

        {/* Top badge - LinkedIn Ready */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: showBadges ? 1 : 0,
            y: showBadges ? 0 : -20,
          }}
          transition={{ duration: 0.5, delay: 0.2, ease: smoothEase }}
          className="absolute -top-2 sm:top-0 right-[5%] sm:right-[10%] md:right-[12%] z-10"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-100/80 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-[#0A66C2] flex items-center justify-center">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700">LinkedIn Ready</span>
            {!shouldSimplify && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ================================================================ */}
      {/* CTA Button - Appears after animation completes                  */}
      {/* ================================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: showBadges ? 1 : 0,
          y: showBadges ? 0 : 20,
        }}
        transition={{
          duration: 0.5,
          delay: shouldSimplify ? 0.1 : 0.3,
          ease: smoothEase,
        }}
        className="flex justify-center mt-8 sm:mt-10 md:mt-12"
      >
        <Link
          href="/signup"
          className="group inline-flex items-center justify-center gap-2 sm:gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl shadow-xl shadow-[#F8935D]/30 hover:shadow-2xl hover:shadow-[#F8935D]/40 transition-all duration-300 active:scale-[0.98]"
        >
          Commencer gratuitement
          <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}
