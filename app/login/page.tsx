"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthPanel from "@/components/auth/AuthPanel";
import ConnectionLoader from "@/components/shared/ConnectionLoader";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

// Premium animation easings - inspired by Linear, Notion
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Animation variants for staggered effects
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: smoothEase,
    },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: smoothEase,
    },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: smoothEase,
    },
  },
};

/**
 * RotatingHero — desktop-only marketing tagline rotator.
 *
 * Cycles through `t.auth.loginHeroRotator` (6 strings) every ROTATION_MS,
 * fading the previous line out as the next fades in. Wrapper has a fixed
 * min-height so the layout never reflows between phrases.
 *
 * Respects `prefers-reduced-motion`: when set, renders only the first line
 * statically with no interval.
 */
const ROTATION_MS = 4000;

function RotatingHero({ messages }: { messages: readonly string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || messages.length <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      ROTATION_MS,
    );
    return () => clearInterval(id);
  }, [messages.length, reduced]);

  // Static fallback — first line, no animation. Explicit width matches the
  // animated version below so layout stays consistent for reduced-motion users.
  if (reduced || messages.length === 0) {
    return (
      <p className="w-[18rem] sm:w-[22rem] lg:w-[26rem] text-gray-600 text-center text-sm lg:text-base leading-relaxed">
        {messages[0] ?? ""}
      </p>
    );
  }

  // Explicit fixed width (not `w-full`) — the parent is a column-flex with
  // `items-center`, which sizes itself to its largest child (the logo, ~128px).
  // `w-full` would inherit that small width and force per-word wrapping.
  //
  // Transition recipe: old line drifts up + softens via blur, new line rises
  // from below + de-blurs as it fades in. Asymmetric timing (faster exit,
  // slower enter) lets the new phrase "land" rather than collide.
  return (
    <div
      className="relative w-[18rem] sm:w-[22rem] lg:w-[26rem] min-h-[3.5rem] lg:min-h-[4rem] flex items-center justify-center"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{
            opacity: { duration: 0.55, ease: smoothEase },
            y: { duration: 0.7, ease: smoothEase },
            filter: { duration: 0.5, ease: smoothEase },
          }}
          className="absolute inset-0 flex items-center justify-center text-center text-gray-600 text-sm lg:text-base leading-relaxed px-2 will-change-[opacity,transform,filter]"
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  const { user, userProfile, loading, needsOnboarding } = useAuth();
  const { t } = useLanguage();
  usePageTitle("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  // Read ?mode=signup from URL to open signup form directly
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  // Force light mode + enable scroll on login page
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");

    root.classList.add("login-scroll-enabled");
    document.body.classList.add("login-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open", "bottomsheet-open", "template-modal-open");

    // Guard: re-remove pwa-mobile periodically (other providers re-add it)
    const guard = setInterval(() => {
      document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked");
    }, 300);

    return () => {
      clearInterval(guard);
      root.classList.remove("login-scroll-enabled");
      document.body.classList.remove("login-scroll-enabled");
    };
  }, []);

  // Redirect authenticated users based on onboarding status
  // - New users (signup) → /onboarding
  // - Existing users (login) → /app
  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);

      // Check if user needs onboarding (new signup or first Google login)
      // This uses both in-memory flag AND localStorage for robustness
      if (needsOnboarding() && !userProfile?.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router, needsOnboarding]);

  // CRITICAL: Block ALL rendering while auth state is loading
  // This prevents any flash of the login page for authenticated users
  // The user sees nothing until we know their auth state
  if (loading) {
    return null; // Invisible - no flash, no loader, just blank
  }

  // If user is authenticated, show minimal loader during redirect
  // This state is very brief as router.push happens immediately
  if (redirecting || user) {
    return (
      <div className="posty-soft-welcome min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-orange/30 border-t-warm-orange rounded-full animate-spin" />
      </div>
    );
  }

  // Only render the login page if user is definitely NOT authenticated
  return (
    <div className="posty-soft-welcome min-h-[100dvh] overflow-x-hidden">
      {/* Ambient background is now painted by the shared `posty-soft-welcome`
          class — the exact same fixed `::before` 5-layer radial gradient used
          inside /app (orange + rose, see app/globals.css). The previous 3
          locally-animated blurred blobs were replaced so the login page reads
          as the same "room" the user enters after authenticating. */}

      {/* Mobile Layout - Independent scroll container for PWA compatibility */}
      <div
        className="md:hidden fixed inset-0 z-10 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
        data-allow-scroll
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="min-h-full flex flex-col px-4"
        >
          {/* Mobile Header - Back */}
          <motion.div
            variants={itemVariants}
            className="flex items-center py-3 shrink-0"
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-500 hover:text-warm-orange transition-colors duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.common.back}
            </Link>
          </motion.div>

          {/* Main content - grows but scrolls when needed */}
          <motion.div
            variants={itemVariants}
            className="flex-1 flex flex-col justify-end pb-8"
          >
            <div className="posty-landing-glass-card relative overflow-hidden rounded-3xl px-5 py-7 sm:px-6 sm:py-8">
              <span aria-hidden className="posty-glass-sheen" />
              <span aria-hidden className="posty-glass-wash" />
              <AuthPanel initialMode={initialMode} onSuccess={() => {}} />
            </div>
          </motion.div>

          {/* Footer links */}
          <motion.div
            variants={itemVariants}
            className="py-4 flex flex-wrap justify-center gap-4 text-xs text-text-muted shrink-0"
          >
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors">{t.common.privacy}</a>
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors">{t.common.terms}</a>
            <a href="/legal/notices" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors">{t.common.legalNotices}</a>
          </motion.div>
        </motion.div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block min-h-[100dvh] relative z-10">
        {/* Left: Premium Branding Area - Fixed so it never scrolls.
            Transparent now so the page-wide `posty-soft-welcome` ambient
            shows through uniformly across both halves, matching /app. */}
        <div className="fixed top-0 left-0 w-1/2 h-[100dvh] flex flex-col items-center justify-center overflow-hidden z-10">
          {/* Additional warm accent for left panel - animated */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: smoothEase }}
              className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-warm-orange/10 rounded-full blur-[80px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: smoothEase }}
              className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-warm-coral/10 rounded-full blur-[60px]"
            />
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col items-center gap-6 relative z-10"
          >
            {/* Logo with warm glow */}
            <motion.div
              variants={logoVariants}
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="/og-image.jpg"
                  alt="Posty Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Warm glow effect */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease: smoothEase }}
                className="absolute -inset-4 bg-gradient-to-br from-warm-orange/30 to-warm-coral/30 rounded-3xl blur-2xl -z-10"
              />
            </motion.div>

            {/* Rotating marketing taglines — fades through 6 messages.
                No `w-full` wrapper: the parent flex-col is auto-width (sized
                to its largest child); a percent-based width would inherit
                that and squeeze the text into a tall column. */}
            <motion.div variants={itemVariants}>
              <RotatingHero messages={t.auth.loginHeroRotator ?? []} />
            </motion.div>

          </motion.div>

          {/* Back to home link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: smoothEase }}
            className="absolute top-6 left-6"
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-500 hover:text-warm-orange transition-colors duration-200 text-sm group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.common.back}
            </Link>
          </motion.div>
        </div>

        {/* Right: Auth Panel — fixed independent scroll container.
            Transparent (no `bg-background-warm`) so the page-wide
            `posty-soft-welcome` ambient covers this half uniformly with
            the left, matching /app. */}
        <div className="fixed top-0 right-0 w-1/2 h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain" data-allow-scroll>
          <div className="min-h-full flex flex-col px-6 lg:px-10 xl:px-14 py-6">
            {/* Form — flex-1 centered with mt-auto/mb-auto on child */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={slideInRight}
              className="flex-1 flex items-center justify-center w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.1, ease: smoothEase }}
                className="w-full max-w-md py-8"
              >
                <div className="posty-landing-glass-card relative overflow-hidden rounded-3xl px-6 py-10 sm:px-8 lg:px-10">
                  <span aria-hidden className="posty-glass-sheen" />
                  <span aria-hidden className="posty-glass-wash" />
                  <AuthPanel initialMode={initialMode} onSuccess={() => {}} />
                </div>
              </motion.div>
            </motion.div>

            {/* Footer links — at the end of the flex flow, always below form */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: smoothEase }}
              className="shrink-0 pt-4"
            >
              <div className="flex gap-4 text-xs text-text-muted justify-center">
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.privacy}</a>
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.terms}</a>
                <a href="/legal/notices" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.legalNotices}</a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
