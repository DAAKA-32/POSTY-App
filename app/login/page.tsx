"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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

export default function LoginPage() {
  const { user, userProfile, loading, needsOnboarding } = useAuth();
  const { t } = useLanguage();
  usePageTitle("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
      <div className="min-h-screen bg-background-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-orange/30 border-t-warm-orange rounded-full animate-spin" />
      </div>
    );
  }

  // Only render the login page if user is definitely NOT authenticated
  return (
    <div className="min-h-[100dvh] bg-background-warm overflow-x-hidden">
      {/* Premium AUTOSCROLL Background Effects - Couleurs dynamiques */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* ORANGE DOMINANT - top left */}
        <motion.div
          initial={{ opacity: 0.1, scale: 1 }}
          animate={(prefersReducedMotion || isMobile) ? {} : {
            opacity: [0.1, 0.18, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 -left-1/4 w-[60%] h-[50%] bg-gradient-to-br from-orange-500/20 to-amber-500/15 rounded-full blur-[100px]"
        />
        {/* ROSE/PINK accent - top right */}
        <motion.div
          initial={{ opacity: 0.08, scale: 1 }}
          animate={(prefersReducedMotion || isMobile) ? {} : {
            opacity: [0.08, 0.15, 0.08],
            scale: [1, 1.12, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-1/4 -right-1/4 w-[45%] h-[45%] bg-gradient-to-br from-pink-500/10 to-rose-500/8 rounded-full blur-[120px]"
        />
        {/* VIOLET premium - center */}
        <motion.div
          initial={{ opacity: 0.06, scale: 1 }}
          animate={(prefersReducedMotion || isMobile) ? {} : {
            opacity: [0.06, 0.12, 0.06],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-gradient-to-br from-violet-500/8 to-purple-500/6 rounded-full blur-[100px]"
        />
        {/* VERT success - bottom left */}
        <motion.div
          initial={{ opacity: 0.07, scale: 1 }}
          animate={(prefersReducedMotion || isMobile) ? {} : {
            opacity: [0.07, 0.13, 0.07],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-0 -left-1/4 w-[40%] h-[40%] bg-gradient-to-br from-emerald-500/10 to-green-500/8 rounded-full blur-[90px]"
        />
        {/* BLEU confiance - bottom right */}
        <motion.div
          initial={{ opacity: 0.08, scale: 1 }}
          animate={(prefersReducedMotion || isMobile) ? {} : {
            opacity: [0.08, 0.14, 0.08],
            scale: [1, 1.09, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 -right-1/4 w-[45%] h-[45%] bg-gradient-to-br from-blue-500/9 to-cyan-500/7 rounded-full blur-[110px]"
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

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
            className="flex-1 flex flex-col justify-center py-4"
          >
            <AuthPanel initialMode={initialMode} onSuccess={() => {}} />
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
        {/* Left: Premium Branding Area - Fixed so it never scrolls */}
        <div className="fixed top-0 left-0 w-1/2 h-[100dvh] bg-background-peach flex flex-col items-center justify-center overflow-hidden z-10">
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

            {/* Tagline */}
            <motion.p
              variants={itemVariants}
              className="text-gray-600 text-center text-sm lg:text-base max-w-xs"
            >
              {t.landing.heroSubtitle}
            </motion.p>

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

        {/* Right: Auth Panel — fixed independent scroll container */}
        <div className="fixed top-0 right-0 w-1/2 h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain bg-background-warm" data-allow-scroll>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideInRight}
            className="min-h-full flex flex-col items-center justify-center p-6 lg:p-10 xl:p-14"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: smoothEase }}
              className="w-full max-w-md"
            >
              <AuthPanel initialMode={initialMode} onSuccess={() => {}} />
            </motion.div>

            {/* Footer links */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: smoothEase }}
              className="py-6 mt-auto shrink-0"
            >
              <div className="flex gap-4 text-xs text-text-muted justify-center">
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.privacy}</a>
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.terms}</a>
                <a href="/legal/notices" target="_blank" rel="noopener noreferrer" className="hover:text-warm-orange transition-colors duration-200">{t.common.legalNotices}</a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
