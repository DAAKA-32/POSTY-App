"use client";

import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion, useInView, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageNames } from "@/lib/i18n";
import type { Language, Translations } from "@/lib/i18n";
import { getAllPlans, getPaidPlans, PlanConfig, GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";

const LANG_FLAGS: Record<Language, string> = {
  en: "🇺🇸", fr: "🇫🇷", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹",
  pt: "🇵🇹", nl: "🇳🇱", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷",
};
const LANG_SHORT: Record<Language, string> = {
  en: "EN", fr: "FR", es: "ES", de: "DE", it: "IT",
  pt: "PT", nl: "NL", zh: "中文", ja: "日本", ko: "한국",
};
import BillingToggle from "@/components/ui/BillingToggle";
import LandingPricingCard from "@/components/pricing/LandingPricingCard";
import BusinessOffer from "@/components/pricing/BusinessOffer";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import AnimatedMacBook from "@/components/landing/AnimatedMacBook";
import LandingSceneEngine from "@/components/landing/LandingSceneEngine";
import LandingTopMask from "@/components/landing/LandingTopMask";
import { FaqJsonLd, postyFaqData } from "@/components/seo/JsonLd";

/* Below-the-fold sections — each is a multi-hundred-line component that
 * eagerly pulls Framer Motion sub-modules and decorative assets. Splitting
 * them keeps the landing route's first dev compile leaner; they hydrate as
 * soon as the script chunk arrives (no Suspense fallback flicker because the
 * placeholder is a transparent block of the same min-height). */
const HowItWorksSection = dynamic(() => import("@/components/landing/HowItWorksSection"), { ssr: true });
const CopilotSection = dynamic(
  () => import("@/components/landing/MockupScreens").then((m) => ({ default: m.CopilotSection })),
  { ssr: true }
);
const ROISimulator = dynamic(() => import("@/components/landing/ROISimulator"), { ssr: true });
const CeriseSpotlight = dynamic(() => import("@/components/landing/CeriseSpotlight"), { ssr: true });
const AmbientDecorations = dynamic(
  () => import("@/components/landing/AmbientDecorations").then((m) => ({ default: m.AmbientDecorations })),
  { ssr: false } // pure decoration — never blocks first paint
);

// =============================================================================
// SCROLL CONTAINER — shared across all landing components in this file
// Uses a bounded div (height: 100dvh, overflow-y: auto) instead of body-level
// =============================================================================
// DESIGN SYSTEM - Soft Orange Palette (consistent with /app and /login)
// =============================================================================
const colors = {
  primary: "#F8935D",      // Soft warm orange
  primaryHover: "#F76B54", // Coral hover
  accent: "#F76B54",       // Coral accent
  peach: "#FBB9AD",        // Light peach
  gradient: "linear-gradient(135deg, #F8935D, #F76B54)", // Premium soft gradient
};

// Premium animation easings - inspired by Linear, Notion
const smoothEase = [0.25, 0.1, 0.25, 1] as const;
const premiumEase = [0.22, 1, 0.36, 1] as const;

// Lightweight mobile detection — avoids heavy infinite animations on mobile
function useIsMobile() {
  // Default true to prevent blur flash on mobile (race condition with useEffect)
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// =============================================================================
// NAVBAR - Premium Mobile-First Design (Stripe / Linear / Notion inspired)
// =============================================================================

// Animated hamburger icon component
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="w-5 h-4 relative flex flex-col justify-between">
      <motion.span
        animate={isOpen ? { rotate: 45, y: 7.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="block w-full h-[2px] bg-gray-900 rounded-full origin-center"
      />
      <motion.span
        animate={isOpen ? { opacity: 0, x: 8 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="block w-full h-[2px] bg-gray-900 rounded-full"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: -7.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="block w-full h-[2px] bg-gray-900 rounded-full origin-center"
      />
    </div>
  );
}

// Mobile nav link data with icons — function to support i18n
function getNavLinks(t: Translations) {
  return [
    {
      label: t.landing.navDemo,
      href: "#demo",
      description: t.landing.navDemoDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      label: t.landing.navFeatures,
      href: "#features",
      description: t.landing.navFeaturesDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: t.landing.navTestimonials,
      href: "#testimonials",
      description: t.landing.navTestimonialsDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: t.landing.navPricing,
      href: "#pricing",
      description: t.landing.navPricingDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
  ];
}

// iOS-style staggered reveal — items drop down from above with a tight
// stagger, exit upward in reverse order. Snappier than the old slide-from-
// right pattern and reads as "menu unfurling" rather than "items pushing in".
const mobileMenuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
};

const mobileItemVariants = {
  hidden: { opacity: 0, y: -12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.16 },
  },
};

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [langOpen, setLangOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, language, setLanguage } = useLanguage();
  const NAV_LINKS_DATA = getNavLinks(t);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll detection — uses native window scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section detection via IntersectionObserver (viewport root)
  useEffect(() => {
    const sectionIds = NAV_LINKS_DATA.map((l) => l.href.replace("#", ""));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(`#${id}`);
        },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Centralized scroll lock when mobile menu is open
  useScrollLock(isMenuOpen);

  // Smooth scroll with proper navbar offset handling — uses native window scroll
  const scrollTo = useCallback((href: string) => {
    setIsMenuOpen(false);

    const scrollToSection = () => {
      const targetElement = document.querySelector(href) as HTMLElement;
      if (!targetElement) return;

      const isMobile = window.innerWidth < 768;
      const navbarOffset = isMobile ? 76 : 84;
      const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: targetPosition - navbarOffset, behavior: "smooth" });
    };

    // Delay slightly for mobile menu close animation
    if (isMenuOpen) {
      setTimeout(scrollToSection, 200);
    } else {
      scrollToSection();
    }
  }, [isMenuOpen]);

  return (
    <>
    {/* Top mask — hides content scrolling up into the navbar zone while
        re-painting the identical page background (seamless). Only active once
        scrolled. */}
    <LandingTopMask visible={isScrolled && !isMenuOpen} />
    {/* Outer fixed container — always full width for positioning */}
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Dynamic container — always visible, border/bg on scroll */}
      <nav
        className={`w-full pointer-events-auto transition-[padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled && !isMenuOpen ? "px-4 pt-3" : "px-0 pt-0"
        }`}
      >
        <div
          className={`
            mx-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isScrolled && !isMenuOpen ? "max-w-[1100px] rounded-[20px]" : "max-w-full rounded-none"}
            ${isScrolled || isMenuOpen
              ? "bg-white shadow-md shadow-gray-900/[0.05] border border-white/40"
              : "bg-transparent border-0"
            }
          `}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-[68px]">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 relative z-[60]">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-md shadow-[#F8935D]/15 ring-1 ring-gray-100">
                  <Image src="/og-image.jpg" alt="Posty" width={40} height={40} className="w-full h-full object-cover" />
                </div>
                <span translate="no" className="notranslate text-lg md:text-xl font-bold text-gray-900 tracking-tight">Posty</span>
              </Link>

              {/* Desktop Nav — pill bg on hover + active indicator */}
              <div className={`
                hidden md:flex items-center gap-0.5 p-1 rounded-2xl transition-all duration-400
                ${isScrolled ? "bg-gray-100/70" : "bg-transparent"}
              `}>
                {NAV_LINKS_DATA.map((link) => {
                  const isActive = activeSection === link.href;
                  return (
                    <button
                      key={link.href}
                      onClick={() => scrollTo(link.href)}
                      className={`
                        relative px-3.5 py-2 rounded-xl font-medium text-[13px] transition-all duration-300 group/navlink
                        ${isActive
                          ? "text-[#F76B54]"
                          : "text-gray-500 hover:text-gray-900"
                        }
                      `}
                    >
                      {/* Active pill background */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-active-pill"
                          className="absolute inset-0 bg-white rounded-xl shadow-sm ring-1 ring-gray-200/60"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      {/* Hover bg — only when not active */}
                      {!isActive && (
                        <span className="absolute inset-0 rounded-xl bg-gray-200/50 opacity-0 group-hover/navlink:opacity-100 transition-opacity duration-200" />
                      )}
                      <span className="relative z-10">{link.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CTA Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {/* Language Switcher Dropdown */}
                <div ref={langRef} className="relative">
                  <button
                    onClick={() => setLangOpen(!langOpen)}
                    className="px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5"
                    aria-label="Switch language"
                  >
                    <span className="text-base">{LANG_FLAGS[language]}</span>
                    <span>{LANG_SHORT[language]}</span>
                    <svg className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
                      {(Object.keys(languageNames) as Language[]).map((code) => (
                        <button
                          key={code}
                          onClick={() => { setLanguage(code); setLangOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${language === code ? "bg-[#F8935D]/10 text-[#F8935D] font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <span>{LANG_FLAGS[code]}</span>
                          <span>{languageNames[code]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/login"
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  {t.landing.navLogin}
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-[13px] font-semibold rounded-xl shadow-md shadow-[#F8935D]/20 hover:shadow-lg hover:shadow-[#F8935D]/25 transition-shadow duration-200"
                  >
                    {t.landing.navSignup}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden relative z-[60] flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
                aria-label={isMenuOpen ? t.landing.navCloseMenu : t.landing.navOpenMenu}
                aria-expanded={isMenuOpen}
              >
                <HamburgerIcon isOpen={isMenuOpen} />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>

    {/* Mobile Full-Screen Menu — outside <nav> to avoid backdrop-blur containment */}
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
          className="md:hidden fixed inset-0 z-[55]"
        >
          {/* Light premium background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8F5] to-white" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, rgba(248,147,93,0.08) 0%, transparent 60%)" }}
          />

          {/* Content container - optimized for mobile visibility */}
          <div
            className="relative h-full flex flex-col overflow-y-auto overscroll-contain"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >

            {/* Top bar: logo + close button - fixed at top */}
            <div
              className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-[#FFF8F5] to-[#FFF8F5]/95 backdrop-blur-sm z-10"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl overflow-hidden shadow-md shadow-[#F8935D]/15 ring-1 ring-gray-100">
                  <Image src="/logo.png" alt="Posty" width={40} height={40} className="w-full h-full object-contain" />
                </div>
                <span translate="no" className="notranslate text-lg font-bold text-gray-900 tracking-tight">Posty</span>
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label={t.landing.navCloseMenu}
              >
                <HamburgerIcon isOpen={true} />
              </button>
            </div>

            {/* Navigation items — iOS-style cells with eyebrow, generous
                tap targets (min 64px), tap-spring feedback, and a left
                gradient bar indicator on the active section. */}
            <nav className="px-4 sm:px-6 pt-2" role="navigation">
              {/* Section eyebrow — iOS Settings-style group label */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="px-3 mb-3"
              >
                <span
                  className="text-[10.5px] font-semibold text-gray-400 uppercase"
                  style={{ letterSpacing: "0.12em" }}
                >
                  {t.landing.navExplore ?? "Explorer"}
                </span>
              </motion.div>

              <motion.div
                variants={mobileMenuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-1.5"
              >
                {NAV_LINKS_DATA.map((link) => {
                  const isActive = activeSection === link.href;
                  return (
                    <motion.button
                      key={link.href}
                      variants={mobileItemVariants}
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      onClick={() => scrollTo(link.href)}
                      className={`
                        relative w-full flex items-center gap-3.5 pl-4 pr-3 py-3.5
                        min-h-[64px] rounded-2xl text-left overflow-hidden
                        transition-[background-color,box-shadow,border-color] duration-200
                        ${isActive
                          ? "bg-white shadow-[0_4px_20px_-8px_rgba(248,147,93,0.25)] ring-1 ring-[#F8935D]/20"
                          : "bg-white/65 ring-1 ring-gray-200/60 active:bg-white active:ring-[#F8935D]/15"
                        }
                      `}
                    >
                      {/* Left gradient bar — iOS active indicator */}
                      <motion.span
                        aria-hidden
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#F8935D] to-[#F76B54]"
                        animate={{ height: isActive ? 32 : 0, opacity: isActive ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />

                      {/* Icon — bigger, square-ish, gradient when active */}
                      <div
                        className={`
                          flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                          transition-colors duration-200
                          ${isActive
                            ? "bg-gradient-to-br from-[#F8935D] to-[#F76B54] text-white shadow-[0_4px_12px_-4px_rgba(248,147,93,0.45)]"
                            : "bg-[#FEF3EE] text-[#F8935D]"
                          }
                        `}
                      >
                        {link.icon}
                      </div>

                      {/* Label + description — refined hierarchy */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[15.5px] font-semibold tracking-[-0.01em] leading-tight ${
                            isActive ? "text-gray-900" : "text-gray-800"
                          }`}
                        >
                          {link.label}
                        </p>
                        <p className="text-[11.5px] text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                          {link.description}
                        </p>
                      </div>

                      {/* Chevron — iOS-style, tints with active state */}
                      <svg
                        className={`
                          w-4 h-4 flex-shrink-0 transition-[color,transform] duration-200
                          ${isActive ? "text-[#F8935D] translate-x-0.5" : "text-gray-300"}
                        `}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.4}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  );
                })}
              </motion.div>
            </nav>

            {/* Spacer to push CTA to bottom */}
            <div className="flex-1 min-h-4" />

            {/* Bottom CTA section - always visible */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="px-4 sm:px-6 pb-4"
            >
              {/* Language Switcher - Mobile.
                  The dropdown is an absolute-positioned overlay that opens
                  UPWARD (bottom-full) so it never pushes the CTAs below the
                  toggle. This kills the iOS Safari layout-shift bug where
                  expanding the dropdown was bumping "Commencer gratuitement"
                  and "Se connecter" out of the viewport. */}
              <div className="relative mb-4">
                <button
                  onClick={() => setMobileLangOpen((v) => !v)}
                  aria-expanded={mobileLangOpen}
                  aria-label="Language"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/70 border border-gray-200/70 active:bg-white transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{LANG_FLAGS[language]}</span>
                    <span className="text-[13px] font-medium text-gray-700 truncate">
                      {languageNames[language]}
                    </span>
                  </span>
                  <motion.svg
                    animate={{ rotate: mobileLangOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                <AnimatePresence initial={false}>
                  {mobileLangOpen && (
                    <motion.div
                      key="mobile-lang-dropdown"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute left-0 right-0 bottom-full mb-2 z-50 origin-bottom"
                    >
                      <div className="grid grid-cols-2 gap-1 p-1.5 rounded-xl bg-white border border-gray-200 shadow-xl shadow-gray-900/10">
                        {(Object.keys(languageNames) as Language[]).map((code) => {
                          const isActive = language === code;
                          return (
                            <button
                              key={code}
                              onClick={() => { setLanguage(code); setMobileLangOpen(false); }}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors duration-150 ${
                                isActive
                                  ? "bg-[#F8935D]/10 text-[#F8935D]"
                                  : "text-gray-600 active:bg-gray-100"
                              }`}
                            >
                              <span className="text-sm leading-none flex-shrink-0">{LANG_FLAGS[code]}</span>
                              <span className="truncate">{languageNames[code]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#F8935D]/20 to-transparent mb-4" />

              <div className="space-y-2.5">
                {/* Primary CTA — bigger tap area, springier press */}
                <motion.div whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                  <Link
                    href="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full h-[52px] rounded-2xl font-bold text-white text-[15.5px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-[0_8px_24px_-8px_rgba(248,147,93,0.5)]"
                  >
                    {t.landing.navStartFree}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>

                {/* Secondary — Login */}
                <motion.div whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-semibold text-sm text-gray-700 bg-white ring-1 ring-gray-200 active:ring-gray-300 transition-[box-shadow] duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.landing.navLogin}
                  </Link>
                </motion.div>
              </div>

              {/* Trust indicators - compact */}
              <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t.landing.navTrial}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{t.landing.navCancelAnytime}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

// =============================================================================
// HERO SECTION — Premium Split Layout (Text Left, Devices Right)
// Inspired by Linear, Stripe, Notion — immersive and conversion-focused
// =============================================================================

function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  // Parallax effect for background elements
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const deviceY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section
      ref={sectionRef}
      className="background-landing relative min-h-[100dvh] lg:min-h-screen flex items-start md:items-center overflow-hidden"
    >
      {/* Ambient gradient + star canvas are now painted by the global
          LandingSceneEngine mounted at the page root. The hero only keeps its
          own cinematic mesh-gradient parallax overlays below — those are a
          hero-specific FX, not part of the unified scene system. */}

      {/* === PREMIUM ANIMATED BACKGROUND === */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Mesh gradient overlay */}
        <motion.div
          style={{ y: prefersReducedMotion ? 0 : bgY }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Primary orange glow - top right (static on mobile to save GPU) */}
          <motion.div
            animate={(prefersReducedMotion || isMobile) ? {} : {
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#F8935D]/25 via-[#F76B54]/15 to-transparent rounded-full blur-[120px]"
          />
          {/* Secondary coral glow - bottom left */}
          <motion.div
            animate={(prefersReducedMotion || isMobile) ? {} : {
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-[#FBB9AD]/30 via-[#F8935D]/15 to-transparent rounded-full blur-[100px]"
          />
          {/* Subtle blue accent - center */}
          <motion.div
            animate={(prefersReducedMotion || isMobile) ? {} : {
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/20 via-violet-100/10 to-transparent rounded-full blur-[150px]"
          />
        </motion.div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-20 md:py-16 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 xl:gap-20 2xl:gap-28 items-center">

          {/* LEFT COLUMN — Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left order-2 lg:order-1"
          >
            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="posty-landing-glass-chip inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-4 md:mb-5 lg:mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-gray-700">
                {t.landing.heroTrustBadge} <span className="font-bold text-gray-900">{t.landing.heroTrustBadgeHighlight}</span>
              </span>
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] border-2 border-white"
                  />
                ))}
              </div>
            </motion.div>

            {/* Brand eyebrow — surfaces the bare brand token "Posty" in
                visible hero copy. Critical for brand-search SEO: without
                this, the word "Posty" appears 0 times in rendered hero text,
                weakening the signal that postyapp.ai is THE Posty entity. */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm font-semibold uppercase tracking-[0.18em] mb-3 lg:mb-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] bg-clip-text text-transparent"
            >
              Posty · The AI LinkedIn copilot
            </motion.p>

            {/* Main headline */}
            <h1 className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] 2xl:text-[4.25rem] font-semibold leading-[1.1] tracking-[-0.02em]">
              <span className="block text-silver-premium">{t.landing.heroTitleLine1}</span>
              <span className="block mt-1 lg:mt-2 text-silver-premium">
                {t.landing.heroTitleLine2}{" "}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-signature-welcome bg-[length:200%_100%] animate-[gradient-x_3s_ease_infinite]">
                    {t.landing.heroTitleHighlight}
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : {}}
                    transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] rounded-full origin-left"
                  />
                </span>
              </span>
              <span className="block mt-1 lg:mt-2 text-silver-premium italic">
                {t.landing.heroTitleLine3}
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 md:mt-5 lg:mt-6 text-lg lg:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              {t.landing.heroSubtitleText}{" "}
              <span className="font-semibold text-gray-800">{t.landing.heroSubtitleBold1}</span>{t.landing.heroSubtitleMid}{" "}
              <span className="font-semibold text-gray-800">{t.landing.heroSubtitleBold2}</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 md:mt-8 lg:mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/signup"
                  className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-signature-welcome bg-[length:200%_100%] animate-[gradient-x_6s_ease_infinite] text-white text-base font-semibold rounded-2xl shadow-xl shadow-[#F8935D]/30 hover:shadow-2xl hover:shadow-[#F8935D]/40 transition-all duration-300 overflow-hidden"
                >
                  {/* Shine effect on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative">{t.landing.heroCTAPrimary}</span>
                  <svg className="relative w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
              <motion.a
                href="#demo"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="posty-landing-glass-chip inline-flex items-center justify-center gap-2.5 px-8 py-4 text-gray-700 text-base font-semibold rounded-2xl hover:border-[#F8935D]/40 hover:text-gray-900 hover:shadow-lg transition-[color,border-color,box-shadow] duration-300"
              >
                <svg className="w-5 h-5 text-[#F8935D]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t.landing.heroCTASecondary}
              </motion.a>
            </motion.div>

            {/* Trust indicators — minimal: trial + guarantee only */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 md:mt-8 lg:mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-gray-500"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t.landing.heroTrial}
              </span>
              <span className="flex items-center gap-2 font-medium text-[#F8935D]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.landing.heroGuarantee}
              </span>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN — Device Mockups */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ y: prefersReducedMotion ? 0 : deviceY }}
            className="relative order-1 lg:order-2"
          >
            {/* Glow effect behind devices */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-[#F8935D]/15 via-[#F76B54]/10 to-[#FBB9AD]/15 rounded-full blur-[80px]" />
            </div>

            {/* Devices container */}
            <div className="relative flex items-end justify-center lg:justify-end gap-4 md:gap-6 py-6 md:py-4 lg:py-0">
              {/* iPhone — floating left */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-20 w-[90px] sm:w-[110px] md:w-[120px] lg:w-[160px] xl:w-[180px] flex-shrink-0"
              >
                {/* Floating animation */}
                <motion.div
                  animate={(prefersReducedMotion || isMobile) ? {} : {
                    y: [0, -8, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Image
                    src="/images/landing/iphone.png"
                    alt={t.landing.heroImgPhone}
                    width={220}
                    height={440}
                    className="w-full h-auto drop-shadow-2xl"
                    priority
                  />
                  {/* Reflection glow */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-gradient-to-t from-[#F8935D]/20 to-transparent blur-xl rounded-full" />
                </motion.div>
              </motion.div>

              {/* MacBook — dominant visual */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-[220px] sm:w-[280px] md:w-[320px] lg:w-[420px] xl:w-[500px]"
              >
                {/* Subtle floating animation */}
                <motion.div
                  animate={(prefersReducedMotion || isMobile) ? {} : {
                    y: [0, -6, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <Image
                    src="/images/landing/mac.png"
                    alt={t.landing.heroImgMac}
                    width={600}
                    height={400}
                    className="w-full h-auto drop-shadow-xl"
                    priority
                  />
                  {/* Reflection glow */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[90%] h-12 bg-gradient-to-t from-[#F8935D]/15 to-transparent blur-2xl rounded-full" />
                </motion.div>
              </motion.div>
            </div>

          </motion.div>

        </div>
      </div>

    </section>
  );
}

// =============================================================================
// DEMO SECTION - Two-Stage Immersive Chat Experience
// =============================================================================

// =============================================================================
// DEMO SECTION — Interactive Demo with AI
// Stage 1: Landing page block — input + suggestions only (no AI response)
// Stage 2: Full-screen overlay — real conversation with AI streaming
// State preserved across navigation (localStorage + React state)
// =============================================================================

function getAllDemoSuggestions(t: Translations) {
  return [
    { label: t.landing.demoPrompt1, emoji: "🎯", text: t.landing.demoPrompt1Desc },
    { label: t.landing.demoPrompt2, emoji: "👤", text: t.landing.demoPrompt2Desc },
    { label: t.landing.demoPrompt3, emoji: "💼", text: t.landing.demoPrompt3Desc },
    { label: t.landing.demoPrompt4, emoji: "📈", text: t.landing.demoPrompt4Desc },
    { label: t.landing.demoPrompt5, emoji: "🤝", text: t.landing.demoPrompt5Desc },
    { label: t.landing.demoPrompt6, emoji: "✍️", text: t.landing.demoPrompt6Desc },
    { label: t.landing.demoPrompt7, emoji: "🚀", text: t.landing.demoPrompt7Desc },
  ];
}

// Module-level flag to track if hero animation played (persists across re-renders, resets on page refresh)
let heroAnimationPlayedGlobal = false;

function DemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const fullScreenChatRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();
  const [titleHeight, setTitleHeight] = useState(0);
  const { t } = useLanguage();

  // ============================================================================
  // ============================================================================
  // CINEMATIC HERO ANIMATION — Phase-based reveal
  // Phase: "init" → "opening" → "settling" → "complete"
  // ============================================================================

  type HeroPhase = "init" | "opening" | "settling" | "complete";
  const alreadyPlayed = heroAnimationPlayedGlobal;

  const [heroPhase, setHeroPhase] = useState<HeroPhase>(alreadyPlayed ? "complete" : "init");
  const [hasAnimated, setHasAnimated] = useState(alreadyPlayed);

  // Word-by-word reveal state
  const HERO_WORDS_L1 = [t.landing.demoTitleWord1, t.landing.demoTitleWord2, t.landing.demoTitleWord3];
  const HERO_WORDS_L2 = [t.landing.demoTitleWord4, t.landing.demoTitleWord5, t.landing.demoTitleWord6];
  const TOTAL_WORDS = HERO_WORDS_L1.length + HERO_WORDS_L2.length;
  const WORD_DELAY = 110;

  const [revealedWords, setRevealedWords] = useState(alreadyPlayed ? TOTAL_WORDS : 0);

  useEffect(() => {
    if (!hasAnimated || revealedWords >= TOTAL_WORDS) return;
    const timer = setTimeout(() => setRevealedWords((c) => c + 1), WORD_DELAY);
    return () => clearTimeout(timer);
  }, [hasAnimated, revealedWords, TOTAL_WORDS]);

  // Phase transitions (timings: init→300ms→opening→1200ms→settling→1000ms→complete)
  useEffect(() => {
    if (alreadyPlayed) return;
    if (prefersReducedMotion) {
      setHeroPhase("complete");
      setHasAnimated(true);
      heroAnimationPlayedGlobal = true;
      return;
    }
    if (heroPhase === "init") {
      const t = setTimeout(() => setHeroPhase("opening"), 300);
      return () => clearTimeout(t);
    }
    if (heroPhase === "opening") {
      const t = setTimeout(() => setHeroPhase("settling"), 1200);
      return () => clearTimeout(t);
    }
    if (heroPhase === "settling") {
      // Text reveal starts now
      setHasAnimated(true);
      heroAnimationPlayedGlobal = true;
      const t = setTimeout(() => setHeroPhase("complete"), 1200);
      return () => clearTimeout(t);
    }
  }, [heroPhase, alreadyPlayed, prefersReducedMotion]);

  // Measure title height for the spacer (fixed positioning removes it from flow)
  useEffect(() => {
    if (!titleRef.current) return;
    const measure = () => setTitleHeight(titleRef.current?.offsetHeight ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Scroll-based title fade — title disappears before content overlaps it
  const scrollYValue = useMotionValue(0);
  useEffect(() => {
    const onScroll = () => scrollYValue.set(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollYValue]);
  const titleOpacity = useTransform(scrollYValue, [0, Math.max(titleHeight * 0.7, 150)], [1, 0]);

  // View mode state
  const [viewMode, setViewMode] = useState<"demo" | "preview" | "video">("preview");

  // Fallback: If user switches to demo before animation completes
  useEffect(() => {
    if (viewMode === "demo" && !hasAnimated) {
      setHasAnimated(true);
      heroAnimationPlayedGlobal = true;
      setHeroPhase("complete");
    }
  }, [viewMode, hasAnimated]);

  // Legacy callback for AnimatedMacBook (no-op, phase system handles it)
  const handleMacBookAnimationComplete = useCallback(() => {}, []);

  // Randomly pick 3 suggestions from the 7 on mount
  const allSuggestions = getAllDemoSuggestions(t);
  const [suggestionIndices] = useState(() => {
    const indices = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
    return indices.slice(0, 3);
  });
  const suggestions = suggestionIndices.map(i => allSuggestions[i]);

  // Demo state
  const [demoUsed, setDemoUsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [showCard, setShowCard] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem("demo_used") === "true") {
        setDemoUsed(true);
        const savedMsg = localStorage.getItem("demo_message");
        const savedRes = localStorage.getItem("demo_response");
        if (savedMsg) setUserMessage(savedMsg);
        if (savedRes) setAiResponse(savedRes);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Centralized scroll lock when full-screen is open
  useScrollLock(showFullScreen);

  // Auto-scroll in full-screen chat as response streams
  useEffect(() => {
    if ((isStreaming || aiResponse) && showFullScreen) {
      fullScreenChatRef.current?.scrollTo({
        top: fullScreenChatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [aiResponse, isStreaming, showFullScreen]);

  // Reveal card content after descent animation completes
  useEffect(() => {
    if (!hasAnimated) return;
    const t = setTimeout(() => setShowCard(true), prefersReducedMotion ? 0 : 800);
    return () => clearTimeout(t);
  }, [hasAnimated, prefersReducedMotion]);

  // Easing tokens
  const premiumEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

  // Send message → open full-screen → stream AI response
  const handleSend = async (message: string) => {
    if (!message.trim() || isStreaming || demoUsed) return;

    const trimmed = message.trim();
    setUserMessage(trimmed);
    setInputValue("");
    setAiResponse("");
    setError("");
    setIsStreaming(true);
    setShowFullScreen(true);

    try {
      localStorage.setItem("demo_message", trimmed);
    } catch { /* */ }

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || t.landing.demoError);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error(t.landing.demoStreamError);

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) continue;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                setAiResponse(fullText);
              }
              if (data.fullContent) {
                fullText = data.fullContent;
                setAiResponse(data.fullContent);
              }
              if (data.message && !data.content && !data.fullContent) {
                setError(data.message);
              }
            } catch { /* skip */ }
          }
        }
      }

      // Mark demo as used + persist response
      setDemoUsed(true);
      try {
        localStorage.setItem("demo_used", "true");
        localStorage.setItem("demo_response", fullText);
      } catch { /* */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.landing.demoGenericError);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cinematic easing for smooth descent
  const cinematicEase = [0.16, 1, 0.3, 1] as [number, number, number, number];



  return (
    <>
      {/* ================================================================== */}
      {/* HERO: Demo Section with Cinematic Reveal                          */}
      {/* ================================================================== */}
      <section
        ref={sectionRef}
        id="demo"
        className="relative z-[6]"
      >
        {/* Hero title — sticky: stays on screen while content scrolls over it, fades out via titleOpacity */}
        <motion.div ref={titleRef} style={{ opacity: titleOpacity }} className="sticky top-0 left-0 right-0 z-[1] pt-24 pb-6 md:pb-2 px-4 sm:px-6 lg:px-8">
          <div className="relative text-center max-w-4xl mx-auto">
            <h2 className="text-[2.5rem] md:text-5xl lg:text-[3.5rem] 2xl:text-[4rem] font-bold tracking-tight flex flex-col items-center gap-0 [&>span]:-my-[0.2em]">
              <span className="block">
                {HERO_WORDS_L1.map((word, i) => (
                  <span
                    key={word}
                    className="text-silver-premium transition-all duration-500 ease-out"
                    style={{
                      display: "inline-block",
                      padding: "0.3em 0",
                      lineHeight: 1,
                      opacity: revealedWords > i ? 1 : 0,
                      transform: revealedWords > i ? "translateY(0)" : "translateY(8px)",
                    }}
                  >
                    {word}{i < HERO_WORDS_L1.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
              <span className="block">
                {HERO_WORDS_L2.map((word, i) => {
                  const globalIndex = HERO_WORDS_L1.length + i;
                  return (
                    <span
                      key={word}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] transition-all duration-500 ease-out"
                      style={{
                        display: "inline-block",
                        padding: "0.3em 0",
                        lineHeight: 1,
                        opacity: revealedWords > globalIndex ? 1 : 0,
                        transform: revealedWords > globalIndex ? "translateY(0)" : "translateY(8px)",
                      }}
                    >
                      {word}{i < HERO_WORDS_L2.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{
                duration: 0.4,
                delay: hasAnimated ? 0.15 : 0,
                ease: cinematicEase,
              }}
              className="mt-3 md:mt-4 text-gray-500 text-[15px] md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              {t.landing.demoInputDesc}
            </motion.p>

            {/* Trustpilot rating — 5 golden stars + clickable label.
                Stars are inline SVG (no extra HTTP request), the whole row is
                a link to the public Posty review page. */}
            <motion.a
              href="https://www.trustpilot.com/review/postyapp.ai"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              transition={{
                duration: 0.4,
                delay: hasAnimated ? 0.25 : 0,
                ease: cinematicEase,
              }}
              className="mt-3 md:mt-4 inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors group/tp"
              aria-label={`5/5 ${t.landing.trustpilotRated}`}
            >
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 md:w-[18px] md:h-[18px] text-amber-400 group-hover/tp:scale-110 transition-transform duration-200"
                    style={{ transitionDelay: `${i * 30}ms` }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span className="text-sm md:text-[15px] font-medium underline-offset-2 group-hover/tp:underline">
                {t.landing.trustpilotRated}
              </span>
            </motion.a>
          </div>
        </motion.div>

        {/* Spacer: compensates for the sticky title */}
        <div style={{ height: titleHeight }} />

        {/* Content — cinematic reveal: starts high + clipped, descends into place */}
        {/* z-[3] scrolls over the fixed title — transparent so aurora shows through */}
        <motion.div
          className="relative z-[3] overflow-x-clip -mt-48 sm:-mt-48 md:-mt-56 lg:-mt-64"
          initial={alreadyPlayed ? undefined : { y: -180 }}
          animate={
            heroPhase === "init" || heroPhase === "opening"
              ? { y: -180 }
              : { y: 0 }
          }
          transition={{ duration: 1.2, ease: cinematicEase }}
        >
          <div className="relative">

            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12">

          {/* Interactive View Mode Tabs */}
          <motion.div
            initial={alreadyPlayed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: 0.5,
              delay: hasAnimated ? 0.3 : 0,
              ease: cinematicEase,
            }}
            className="flex justify-center max-w-[1084px] mx-auto"
          >
            <div className="inline-flex items-end gap-1">
              {/* Preview Tab */}
              <button
                onClick={() => setViewMode("preview")}
                className={`
                  relative px-5 py-2 md:px-6 md:py-2.5 rounded-t-xl text-sm md:text-base font-semibold transition-all duration-300 ease-out border border-b-0
                  ${viewMode === "preview"
                    ? "bg-white border-gray-200/60 text-[#F8935D] z-10"
                    : "bg-gray-100/80 border-gray-200/40 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t.landing.demoPreviewLabel}
                </span>
              </button>

              {/* Video Tab */}
              <button
                onClick={() => setViewMode("video")}
                className={`
                  relative px-5 py-2 md:px-6 md:py-2.5 rounded-t-xl text-sm md:text-base font-semibold transition-all duration-300 ease-out border border-b-0
                  ${viewMode === "video"
                    ? "bg-white border-gray-200/60 text-[#F8935D] z-10"
                    : "bg-gray-100/80 border-gray-200/40 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {(t.landing as { demoVideoLabel?: string }).demoVideoLabel || "See in action"}
                </span>
              </button>

              {/* Demo Tab */}
              <button
                onClick={() => setViewMode("demo")}
                className={`
                  relative px-5 py-2 md:px-6 md:py-2.5 rounded-t-xl text-sm md:text-base font-semibold transition-all duration-300 ease-out border border-b-0
                  ${viewMode === "demo"
                    ? "bg-white border-gray-200/60 text-[#F8935D] z-10"
                    : "bg-gray-100/80 border-gray-200/40 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.landing.demoTryDemo}
                </span>
              </button>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* Demo Card — descends from above                              */}
          {/* ============================================================ */}
          {viewMode === "demo" && (
              <div className="max-w-[1084px] mx-auto">

                {/* Main demo card */}
                <div className="relative bg-white border border-gray-200/60 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-gray-400/20">

              {/* MacBook-style title bar */}
              <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
                    <Image src="/logo.png" alt="Posty" width={40} height={40} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p translate="no" className="notranslate text-gray-900 font-semibold text-sm md:text-base">Posty</p>
                    <p className="text-[11px] md:text-xs text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      {t.landing.demoReadyToGenerate}
                    </p>
                  </div>
                </div>
                {/* MacBook traffic light dots */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm shadow-[#FF5F57]/30" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-sm shadow-[#FEBC2E]/30" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-sm shadow-[#28C840]/30" />
                </div>
              </div>

              {/* Chat area — same aspect ratio as product preview carousel */}
              <div className="relative p-5 md:p-8 bg-gradient-to-b from-gray-50/80 to-gray-50/40 aspect-[96/45] flex flex-col">

                {/* Already used — option to revisit response */}
                {demoUsed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center py-8"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F8935D]/10 to-[#F76B54]/10 flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-semibold text-base mb-1">{t.landing.demoPostReady}</p>
                    <p className="text-gray-500 text-sm mb-5 max-w-xs">
                      {t.landing.demoPostReadyDesc}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {aiResponse && (
                        <button
                          onClick={() => setShowFullScreen(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:border-[#F8935D]/40 hover:text-gray-900 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {t.landing.demoViewPost}
                        </button>
                      )}
                      <Link
                        href="/signup"
                        className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                      >
                        {t.landing.demoPublishFirst}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* Initial state — centered logo + numbered suggestions + input */}
                {!demoUsed && showCard && (
                  <motion.div
                    initial={alreadyPlayed ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Centered content: logo + text + numbered suggestions */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {/* Posty logo */}
                      <motion.div
                        initial={alreadyPlayed ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: premiumEase }}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg shadow-[#F8935D]/15 ring-1 ring-gray-100 mb-5"
                      >
                        <Image src="/logo.png" alt="Posty" width={64} height={64} className="w-full h-full object-contain" />
                      </motion.div>

                      {/* Instructional text */}
                      <motion.div
                        initial={alreadyPlayed ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15, ease: premiumEase }}
                        className="flex flex-col items-center mb-6 md:mb-8"
                      >
                        <p className="text-gray-500 text-sm md:text-base">
                          {t.landing.demoInputPlaceholder}
                        </p>
                        <div className="mt-2.5 h-[2px] w-16 bg-gradient-to-r from-[#F8935D] to-[#F76B54] rounded-full" />
                      </motion.div>

                      {/* Three numbered suggestions — stacked vertically */}
                      <div className="w-full max-w-sm space-y-2.5">
                        {suggestions.map((suggestion, i) => (
                          <motion.button
                            key={suggestion.label}
                            initial={alreadyPlayed ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 + i * 0.08, ease: premiumEase }}
                            onClick={() => handleSend(suggestion.text)}
                            whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(248, 147, 93, 0.12)" }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center gap-3.5 px-4 py-3 md:px-5 md:py-3.5 bg-white border border-gray-200 rounded-xl text-left text-sm md:text-[15px] text-gray-700 hover:border-[#F8935D]/50 hover:bg-[#F8935D]/5 hover:text-gray-900 transition-colors duration-200 shadow-sm"
                          >
                            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F8935D]/10 to-[#F76B54]/10 flex items-center justify-center text-[#F8935D] text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="leading-snug">{suggestion.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Input bar — matches /app UniversalChatInput style */}
                    <form onSubmit={handleSubmit} className="light-input relative mt-6">
                      <div className="relative rounded-[20px] border border-gray-200 bg-white shadow-sm focus-within:border-[#F8935D]/50 focus-within:ring-2 focus-within:ring-[#F8935D]/20 transition-all duration-200">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={t.landing.demoInputExample}
                          className="w-full text-sm md:text-[15px] placeholder-gray-400 bg-transparent py-3.5 md:py-4 pl-5 pr-16 rounded-[20px] focus:outline-none"
                          disabled={isStreaming}
                        />
                        {/* Send button — right side */}
                        <div className="absolute flex items-center right-2.5 top-1/2 -translate-y-1/2">
                          <motion.button
                            type="submit"
                            whileTap={{ scale: inputValue.trim() && !isStreaming ? 0.95 : 1 }}
                            disabled={!inputValue.trim() || isStreaming}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                              inputValue.trim() && !isStreaming
                                ? "bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white shadow-md shadow-[#F8935D]/20"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                          </motion.button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
            )}

            {viewMode === "preview" && (
              <motion.div
                className="relative"
                // Reveal-from-center animation. End state intentionally uses
                // *negative* insets: a plain `inset(0% 0 0% 0)` clip would
                // chop the MacBook's drop shadow + the ground-shadow ellipse
                // exactly at the bounding box, drawing a hard horizontal line
                // right at the section boundary with the next "Tout ce qu'il
                // vous faut…" block. Keeping consistent % units so framer
                // interpolates cleanly between the two clip-path values.
                initial={alreadyPlayed ? undefined : { clipPath: "inset(50% -20% 50% -20%)" }}
                animate={
                  heroPhase === "init"
                    ? { clipPath: "inset(50% -20% 50% -20%)" }
                    : { clipPath: "inset(-30% -20% -30% -20%)" }
                }
                transition={{ duration: 1, ease: cinematicEase }}
              >
                <AnimatedMacBook
                  isVisible={viewMode === "preview"}
                  onAnimationComplete={handleMacBookAnimationComplete}
                />
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* Video — MacBook frame wrapping a looping product demo video  */}
            {/* ============================================================ */}
            {viewMode === "video" && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: cinematicEase }}
              >
                <div className="relative w-full max-w-[1084px] mx-auto">
                  {/* MacBook lid */}
                  <div className="relative bg-gradient-to-b from-[#2a2a2c] via-[#1d1d1f] to-[#141416] rounded-[12px] sm:rounded-[18px] md:rounded-[22px] p-[5px] sm:p-2 md:p-2.5 shadow-2xl shadow-black/40 ring-1 ring-black/50">
                    <div className="absolute top-[5px] sm:top-2 md:top-2.5 left-1/2 -translate-x-1/2 w-10 sm:w-14 md:w-16 h-1 md:h-1.5 bg-[#050505] rounded-b-[5px] z-20 pointer-events-none" />

                    {/* Browser window frame */}
                    <div className="relative bg-white rounded-md md:rounded-lg overflow-hidden border border-black/30">
                      <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#FF5F57] shadow-sm shadow-[#FF5F57]/30" />
                          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#FEBC2E] shadow-sm shadow-[#FEBC2E]/30" />
                          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#28C840] shadow-sm shadow-[#28C840]/30" />
                        </div>
                        <div className="flex-1 mx-4 md:mx-8">
                          <div className="bg-gray-100/80 rounded-lg px-3 py-1 md:py-1.5 flex items-center justify-center gap-1.5">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-[11px] md:text-xs text-gray-400 font-medium truncate">postyapp.ai</span>
                          </div>
                        </div>
                        <div className="w-[52px] md:w-[62px]" />
                      </div>

                      <div className="relative aspect-[16/9] bg-[#FAFAF8] overflow-hidden">
                        {/* Real Posty workflow recording — autoplay loop muted,
                            captured via Playwright + ffmpeg (scripts/record-demo.mjs).
                            Inert text fallback inside <video> — never put a React
                            component here: even when the video plays, the fallback
                            children mount and their effects run in parallel, which
                            collides with Suspense cleanup (React DevTools warning). */}
                        <video
                          src="/videos/posty-demo.mp4?v=2"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          aria-label="Posty product demo: prompt → AI generation → publish to LinkedIn"
                          className="absolute inset-0 w-full h-full object-cover"
                        >
                          Your browser does not support HTML5 video.
                        </video>
                      </div>
                    </div>
                  </div>

                  {/* MacBook hinge */}
                  <div className="relative -mt-[1px] mx-auto w-[101%] sm:w-[101.5%] flex justify-center">
                    <div className="h-1 sm:h-1.5 md:h-2 w-full bg-gradient-to-b from-[#3a3a3c] via-[#2c2c2e] to-[#1d1d1f] rounded-b-lg sm:rounded-b-xl shadow-md shadow-black/20" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[18%] h-[2px] sm:h-[3px] bg-[#0f0f0f] rounded-b-md" />
                  </div>
                </div>
              </motion.div>
            )}

            </div> {/* close content-inner (relative z-10) */}
          </div> {/* close content-bg (relative) */}
        </motion.div> {/* close cinematic content wrapper (motion.div with translateY) */}
      </section>

      {/* ================================================================== */}
      {/* STAGE 2: Full-Screen Chat Overlay                                  */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showFullScreen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: premiumEase }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            {/* Full-screen header */}
            <div className="flex items-center gap-3 px-4 md:px-8 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setShowFullScreen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl overflow-hidden shadow-sm">
                  <Image src="/logo.png" alt="Posty" width={36} height={36} className="w-full h-full object-contain" />
                </div>
                <div>
                  <p translate="no" className="notranslate text-gray-900 font-semibold text-sm">Posty</p>
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {isStreaming ? t.landing.demoWriting : t.landing.demoAIReady}
                  </p>
                </div>
              </div>
            </div>

            {/* Full-screen chat body */}
            <div
              ref={fullScreenChatRef}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
            >
              <div className="max-w-2xl mx-auto space-y-5">
                {/* User message */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: premiumEase }}
                  className="flex justify-end"
                >
                  <div className="px-5 py-3.5 bg-[#F8935D]/10 border border-[#F8935D]/20 rounded-2xl rounded-br-sm max-w-[85%] md:max-w-[70%]">
                    <p className="text-gray-900 text-sm md:text-base leading-relaxed">{userMessage}</p>
                  </div>
                </motion.div>

                {/* AI response */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15, ease: premiumEase }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 md:w-9 md:h-9 flex-shrink-0 rounded-xl overflow-hidden shadow-md shadow-[#F8935D]/20 mt-0.5">
                    <Image src="/logo.png" alt="Posty" width={36} height={36} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm">
                      {/* Typing indicator */}
                      {isStreaming && !aiResponse && (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-2 h-2 bg-[#F8935D] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-[#F8935D] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-[#F8935D] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                      {/* Streamed text */}
                      {aiResponse && (
                        <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-line">
                          {aiResponse}
                          {isStreaming && (
                            <span className="inline-block w-0.5 h-4 bg-[#F8935D] ml-0.5 animate-pulse align-text-bottom" />
                          )}
                        </p>
                      )}
                      {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                      )}
                    </div>

                    {/* Post-completion actions */}
                    {!isStreaming && aiResponse && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="mt-4 space-y-4"
                      >
                        <button
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#F8935D] transition-colors"
                        >
                          {copied ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {t.landing.demoCopied}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {t.landing.demoCopyPost}
                            </>
                          )}
                        </button>

                        <div className="px-5 py-4 bg-gradient-to-r from-[#F8935D]/5 to-[#F76B54]/5 border border-[#F8935D]/15 rounded-xl">
                          <p className="text-gray-600 text-sm mb-3">
                            {t.landing.demoProspectMessage}
                          </p>
                          <Link
                            href="/signup"
                            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                          >
                            {t.landing.demoPublishFirst}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// KEY BENEFITS SECTION - Premium Editorial Layout
// Business-focused, human-centered design
// =============================================================================

// Legacy _LEGACY_BENEFITS_DATA kept for reference but not used
// Note: This data is not rendered but kept for reference. Translations exist at t.landing.benefit1Title etc.
const _LEGACY_BENEFITS_DATA = [
  {
    number: "01",
    title: "Gagnez 5h par semaine",
    highlight: "5h par semaine",
    description: "Posts prêts à publier en 30 secondes, adaptés à votre voix.",
    stat: { value: "5h", unit: "", label: "économisées" },
    icon: (
      <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: {
      primary: "#3B82F6",
      secondary: "#2563EB",
      bg: "from-blue-50 via-indigo-50/80 to-white",
      glow: "rgba(59, 130, 246, 0.3)",
    },
  },
  {
    number: "02",
    title: "Multipliez votre engagement par 3",
    highlight: "engagement par 3",
    description: "Posts optimisés pour l'algorithme LinkedIn. Plus de vues, plus de prospects.",
    stat: { value: "x3", unit: "", label: "engagement" },
    icon: (
      <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: {
      primary: "#F59E0B",
      secondary: "#D97706",
      bg: "from-amber-50 via-orange-50/80 to-white",
      glow: "rgba(245, 158, 11, 0.3)",
    },
  },
  {
    number: "03",
    title: "Devenez la reference de votre marche",
    highlight: "la reference",
    description: "En 90 jours, positionnez-vous comme l'expert de votre secteur.",
    stat: { value: "90", unit: "j", label: "pour briller" },
    icon: (
      <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    color: {
      primary: "#8B5CF6",
      secondary: "#A855F7",
      bg: "from-violet-50 via-purple-50/80 to-white",
      glow: "rgba(139, 92, 246, 0.3)",
    },
  },
  {
    number: "04",
    title: "Un pipeline de prospects sans fin",
    highlight: "prospects sans fin",
    description: "LinkedIn devient votre canal d'acquisition principal.",
    stat: { value: "24/7", unit: "", label: "actif" },
    icon: (
      <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: {
      primary: "#10B981",
      secondary: "#059669",
      bg: "from-emerald-50 via-teal-50/80 to-white",
      glow: "rgba(16, 185, 129, 0.3)",
    },
  },
];

// Legacy Benefit Card Component - kept for reference, not used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _LegacyBenefitCard({
  benefit,
  isActive,
  position,
  onClick,
}: {
  benefit: typeof _LEGACY_BENEFITS_DATA[0];
  isActive: boolean;
  position: number; // -1 = left, 0 = center, 1 = right, 2+ = hidden
  onClick?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Enable hover effect on desktop for active card only
  const enableHoverEffect = isActive && !prefersReducedMotion && !isMobile;

  // Door is open when hovering on desktop
  const isDoorOpen = enableHoverEffect && isHovered;

  // Show description: always on mobile (inline), revealed behind door on desktop
  const showDescriptionMobile = isMobile;

  // Calculate precise transforms based on position
  const getTransform = () => {
    if (position === 0) {
      return { x: 0, scale: 1, rotateY: 0, z: 0, opacity: 1, filter: "blur(0px)" };
    }
    if (position === -1) {
      return { x: -110, scale: 0.82, rotateY: 12, z: -150, opacity: 0.5, filter: "blur(2px)" };
    }
    if (position === 1) {
      return { x: 110, scale: 0.82, rotateY: -12, z: -150, opacity: 0.5, filter: "blur(2px)" };
    }
    return {
      x: position < 0 ? -200 : 200,
      scale: 0.6,
      rotateY: position < 0 ? 20 : -20,
      z: -300,
      opacity: 0,
      filter: "blur(4px)",
    };
  };

  const transform = getTransform();

  return (
    <motion.div
      initial={false}
      animate={{
        x: `${transform.x}%`,
        scale: transform.scale,
        rotateY: prefersReducedMotion ? 0 : transform.rotateY,
        z: transform.z,
        opacity: transform.opacity,
        filter: prefersReducedMotion ? "blur(0px)" : transform.filter,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 26,
        mass: 0.9,
        opacity: { duration: 0.4, ease: "easeOut" },
        filter: { duration: 0.4, ease: "easeOut" },
      }}
      onClick={!isActive ? onClick : undefined}
      onMouseEnter={() => enableHoverEffect && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
        willChange: "transform, opacity, filter",
      }}
      className={`absolute inset-0 m-auto w-[90%] sm:w-[85%] md:w-[480px] lg:w-[520px] h-fit ${
        isActive ? "z-30" : "z-10 cursor-pointer"
      }`}
    >
      {/* 3D Container for door effect - needs perspective for realistic 3D */}
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          perspective: 1500,
        }}
      >
        {/* Description panel - revealed behind when door opens (desktop only) */}
        {!isMobile && (
          <motion.div
            initial={false}
            animate={{
              opacity: isDoorOpen ? 1 : 0,
              scale: isDoorOpen ? 1 : 0.95,
            }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
              delay: isDoorOpen ? 0.1 : 0,
            }}
            className={`absolute inset-0 rounded-3xl p-6 md:p-8 bg-gradient-to-br ${benefit.color.bg} overflow-hidden`}
            style={{
              zIndex: 1,
              boxShadow: `inset 0 2px 20px -5px ${benefit.color.glow}, 0 0 0 1px rgba(255,255,255,0.5)`,
            }}
          >
            {/* Background glow for description panel */}
            <div
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-50"
              style={{ background: benefit.color.glow }}
            />

            <div className="relative z-10 h-full flex flex-col justify-center py-2">
              {/* Small icon reference */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shadow-md"
                  style={{ boxShadow: `0 4px 16px -4px ${benefit.color.glow}` }}
                >
                  <div className="scale-75" style={{ color: benefit.color.primary }}>{benefit.icon}</div>
                </div>
                <span className="text-sm font-semibold text-gray-600">{benefit.title.split(" ").slice(0, 3).join(" ")}...</span>
              </div>

              {/* Description text - main content */}
              <p className="text-gray-800 text-base md:text-lg leading-relaxed font-medium">
                {benefit.description}
              </p>

              {/* Stat reminder */}
              <div className="mt-5 flex items-center gap-2 p-3 bg-white/60 rounded-xl w-fit">
                <span className="text-2xl font-bold" style={{ color: benefit.color.primary }}>
                  {benefit.stat.value}
                </span>
                {benefit.stat.unit && (
                  <span className="text-lg font-semibold" style={{ color: benefit.color.secondary }}>
                    {benefit.stat.unit}
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-1">{benefit.stat.label}</span>
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(to right, ${benefit.color.primary}, ${benefit.color.secondary})` }}
            />
          </motion.div>
        )}

        {/* Main door card - pivots on LEFT edge like a door */}
        <motion.div
          initial={false}
          animate={{
            rotateY: isDoorOpen ? -85 : 0,
            boxShadow: isDoorOpen
              ? `25px 15px 50px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.9)`
              : isActive
              ? `0 25px 50px -12px ${benefit.color.glow}, 0 0 0 1px rgba(255,255,255,0.8)`
              : "0 10px 30px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.6)",
          }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
            rotateY: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
          }}
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            zIndex: 2,
            backfaceVisibility: "hidden",
          }}
          className={`relative rounded-3xl p-6 md:p-8 bg-gradient-to-br ${benefit.color.bg} overflow-hidden`}
        >
          {/* Background glow */}
          <motion.div
            initial={false}
            animate={{ opacity: isActive && !isDoorOpen ? 0.6 : 0, scale: isActive ? 1 : 0.8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
            style={{ background: benefit.color.glow }}
          />

          <div className="relative z-10">
            {/* Top row: Icon + Number + Stat */}
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-3 md:gap-4">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center"
                  style={{ boxShadow: `0 8px 32px -8px ${benefit.color.glow}` }}
                >
                  <div style={{ color: benefit.color.primary }}>{benefit.icon}</div>
                </motion.div>
                <span className="text-4xl md:text-5xl font-black text-gray-200/40 select-none tracking-tighter">
                  {benefit.number}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg">
                <span className="text-xl md:text-2xl font-bold" style={{ color: benefit.color.primary }}>
                  {benefit.stat.value}
                </span>
                {benefit.stat.unit && (
                  <span className="text-base md:text-lg font-semibold" style={{ color: benefit.color.secondary }}>
                    {benefit.stat.unit}
                  </span>
                )}
                <span className="text-[10px] md:text-xs text-gray-500 ml-0.5 md:ml-1">{benefit.stat.label}</span>
              </div>
            </div>

            {/* Title - Always visible */}
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
              {benefit.title.split(benefit.highlight).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span style={{ color: benefit.color.primary }}>{benefit.highlight}</span>
                  )}
                </span>
              ))}
            </h3>

            {/* Description - Inline on mobile only */}
            {showDescriptionMobile && (
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                {benefit.description}
              </p>
            )}
          </div>

          {/* Bottom accent line */}
          <motion.div
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0.4,
              scaleX: isActive ? 1 : 0.92,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 h-1 origin-center"
            style={{ background: `linear-gradient(to right, ${benefit.color.primary}, ${benefit.color.secondary})` }}
          />
        </motion.div>
      </div>

      {/* Hover hint - desktop only */}
      {isActive && !isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDoorOpen ? 0 : 0.6 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="hidden md:flex absolute -bottom-8 left-1/2 -translate-x-1/2 items-center gap-1.5 text-xs text-gray-400"
        >
          <span>Survolez pour en savoir plus</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Legacy Navigation Dot Component - kept for reference, not used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _LegacyCarouselDot({
  isActive,
  isPaused,
  color,
  onClick,
  duration = 5000,
}: {
  isActive: boolean;
  isPaused: boolean;
  color: string;
  onClick: () => void;
  duration?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-8 h-8 aspect-square group"
      aria-label="Navigation slide"
    >
      {/* Outer ring for active state - perfectly circular */}
      <motion.div
        initial={false}
        animate={{
          scale: isActive ? 1 : 0,
          opacity: isActive ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute inset-0 rounded-full aspect-square"
        style={{
          border: `2px solid ${color}20`,
        }}
      />

      {/* Progress ring - using square viewBox for perfect circle */}
      {isActive && !isPaused && !prefersReducedMotion && (
        <svg
          className="absolute inset-0 w-8 h-8 aspect-square -rotate-90"
          viewBox="0 0 32 32"
          preserveAspectRatio="xMidYMid meet"
        >
          <motion.circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            style={{ opacity: 0.6 }}
            key={`progress-${isActive}`}
          />
        </svg>
      )}

      {/* Dot itself - perfectly circular with explicit aspect-square */}
      <motion.div
        initial={false}
        animate={{
          scale: isActive ? 1 : 0.7,
          backgroundColor: color,
        }}
        whileHover={{ scale: isActive ? 1 : 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative w-2.5 h-2.5 aspect-square rounded-full"
        style={{
          boxShadow: isActive ? `0 0 12px ${color}50` : "none",
        }}
      />
    </button>
  );
}

function KeyBenefitsSection() {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();

  // Premium stagger animation for grid items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.03,
        delayChildren: 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section id="benefices" className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
      {/* Transparent — let the LandingAmbientCanvas wash (posts zone:
          violet/coral) shine through. The white bento cards below still pop
          because they own opaque white surfaces with rings/shadows. */}

      {/* Subtle texture overlay — kept for organic grain on top of ambient */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Editorial style */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-16 md:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-semibold leading-[1.15] tracking-tight mb-5">
            <span className="text-silver-shimmer">{t.landing.resultsTitle1}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#E8824C]">
              {t.landing.resultsTitle2}
            </span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {t.landing.resultsSubtitle}
          </p>
        </motion.div>

        {/* Bento Grid Layout - Asymmetric premium design */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6"
        >
          {/* Card 1 - Primary Feature (Large) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 lg:col-span-2 group"
          >
            <div className="relative h-full p-6 sm:p-8 lg:p-10 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-300">
              {/* Subtle gradient accent on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F8935D]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F8935D]/10 to-[#F76B54]/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 leading-snug">
                  {t.landing.resultsProductivityTitle}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 max-w-xl">
                  {t.landing.resultsProductivityDesc}
                </p>

                {/* Metric highlight */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-gray-900">5h</span>
                  <span className="text-gray-500">{t.landing.resultsProductivityStat}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Secondary Feature */}
          <motion.div
            variants={itemVariants}
            className="group"
          >
            <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t.landing.resultsAudienceTitle}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  {t.landing.resultsAudienceDesc}
                </p>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-gray-900">x3</span>
                  <span className="text-sm text-gray-500">{t.landing.resultsAudienceStat}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3 - Tertiary Feature */}
          <motion.div
            variants={itemVariants}
            className="group"
          >
            <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t.landing.resultsOpportunitiesTitle}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  {t.landing.resultsOpportunitiesDesc}
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-white" />
                  </div>
                  <span className="text-sm text-gray-500">{t.landing.resultsOpportunitiesStat}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Quote/Social Proof */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group"
          >
            <div className="relative h-full p-6 sm:p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }} />
              </div>

              {/* Accent glow */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F8935D]/20 rounded-full blur-[80px]" />

              <div className="relative z-10">
                <svg className="w-8 h-8 text-[#F8935D]/60 mb-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                <blockquote className="text-lg sm:text-xl text-white/90 leading-relaxed mb-6 max-w-2xl">
                  &ldquo;{t.landing.resultsTestimonial}&rdquo;
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center text-white font-semibold text-lg">
                    M
                  </div>
                  <div>
                    <p className="text-white font-medium">Marie Dubois</p>
                    <p className="text-white/60 text-sm">{t.landing.resultsTestimonialRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}

// Legacy KeyBenefitsSection - carousel version (not used)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _LegacyKeyBenefitsSection() {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance carousel
  useEffect(() => {
    if (prefersReducedMotion || isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % _LEGACY_BENEFITS_DATA.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion, isPaused]);

  // Handle navigation
  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % _LEGACY_BENEFITS_DATA.length);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + _LEGACY_BENEFITS_DATA.length) % _LEGACY_BENEFITS_DATA.length);
  };

  // Handle swipe/drag
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX - clientX;
    const threshold = 50;

    if (diff > threshold) {
      goNext();
    } else if (diff < -threshold) {
      goPrev();
    }
  };

  // Calculate position relative to active index
  const getPosition = (index: number) => {
    const diff = index - activeIndex;
    if (diff === 0) return 0;
    if (diff === 1 || diff === -(_LEGACY_BENEFITS_DATA.length - 1)) return 1;
    if (diff === -1 || diff === _LEGACY_BENEFITS_DATA.length - 1) return -1;
    return diff > 0 ? 2 : -2;
  };

  return (
    <section id="benefices-comparison" className="relative py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white via-gray-50/50 to-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-[#F8935D]/15 to-transparent rounded-full blur-[120px]"
        />
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-gradient-to-bl from-[#3B82F6]/12 to-transparent rounded-full blur-[100px]"
        />
      </div>

      <div className="relative z-10 max-w-[1084px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: premiumEase }}
          className="text-center max-w-3xl mx-auto mb-10 lg:mb-14"
        >
          {/* Heading */}
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold mb-4 leading-tight tracking-tight">
            <span className="text-silver-shimmer">Pourquoi les entrepreneurs choisissent</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              Posty
            </span>
          </h2>
        </motion.div>

        {/* 3D Carousel Container - Centered within 1084px */}
        <div
          ref={containerRef}
          className="relative mx-auto w-full max-w-[900px]"
          style={{ perspective: "1400px", perspectiveOrigin: "center center" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
        >
          {/* Cards Container - Fixed height with flex centering */}
          <div
            className="relative w-full h-[280px] sm:h-[300px] md:h-[320px] lg:h-[340px] 2xl:h-[380px] flex items-center justify-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {_LEGACY_BENEFITS_DATA.map((benefit: typeof _LEGACY_BENEFITS_DATA[0], index: number) => (
              <_LegacyBenefitCard
                key={benefit.number}
                benefit={benefit}
                isActive={index === activeIndex}
                position={getPosition(index)}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>

          {/* Navigation Arrows - Perfectly aligned */}
          <button
            onClick={goPrev}
            className="hidden md:flex absolute left-2 lg:left-4 xl:-left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-200/50 border border-gray-100 items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Précédent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="hidden md:flex absolute right-2 lg:right-4 xl:-right-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-200/50 border border-gray-100 items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Suivant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Navigation Dots - Perfectly Centered & Aligned */}
        <div className="flex items-center justify-center gap-1 mt-8">
          {_LEGACY_BENEFITS_DATA.map((benefit: typeof _LEGACY_BENEFITS_DATA[0], index: number) => (
            <_LegacyCarouselDot
              key={benefit.number}
              isActive={index === activeIndex}
              isPaused={isPaused}
              color={benefit.color.primary}
              onClick={() => goToSlide(index)}
              duration={5000}
            />
          ))}
        </div>

        {/* Swipe hint - Mobile only */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="md:hidden flex items-center justify-center gap-2 mt-4"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span className="text-xs text-gray-400 font-medium">Glissez pour naviguer</span>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// TARGET AUDIENCE SECTION — Editorial warm series
// =============================================================================
/**
 * Curated SaaS palette — three distinct hues, one per persona archetype.
 * Brand orange anchors Posty's identity; indigo and emerald are reserved
 * for the persona cards (the only place these cool colors are allowed,
 * acting as semantic differentiation, not decoration).
 *
 * Saturation calibrated to feel premium (Stripe/Linear/Notion class), not
 * the over-bright rainbow we had before. Text values are AA-safe darker
 * variants for the persona's tag pill on white.
 */
const audienceAccents = {
  sunrise: {
    hex: "#F8935D",     // Posty brand orange — Entrepreneurs (action, speed)
    rgb: "248, 147, 93",
    text: "#B5532E",
  },
  brand: {
    hex: "#6366F1",     // Indigo-500 — Agencies (strategy, scale)
    rgb: "99, 102, 241",
    text: "#4338CA",    // Indigo-700, AA-safe on white
  },
  burnt: {
    hex: "#10B981",     // Emerald-500 — Freelances (growth, craft)
    rgb: "16, 185, 129",
    text: "#047857",    // Emerald-700, AA-safe on white
  },
} as const;
type AudienceAccent = keyof typeof audienceAccents;

function getAudienceProfiles(t: Translations) {
  /* Dead i18n fields (subtitle/painPoint/Stat1/Stat2) are intentionally not
   * destructured \u2014 they're not rendered. Keys are preserved in translations
   * for potential future surfaces. */
  return [
    {
      title: t.landing.audience1Title,
      solution: t.landing.audience1Solution,
      tag: t.landing.audience1Ideal,
      accent: "sunrise" as AudienceAccent,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      title: t.landing.audience2Title,
      solution: t.landing.audience2Solution,
      tag: t.landing.audience2Ideal,
      accent: "brand" as AudienceAccent,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      title: t.landing.audience3Title,
      solution: t.landing.audience3Solution,
      tag: t.landing.audience3Ideal,
      accent: "burnt" as AudienceAccent,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
  ];
}

/**
 * Single persona card in the "À qui s'adresse Posty" grid. Mirrors the
 * reference layout: a bare outline accent icon up top, bold title, muted
 * description. Entrance fades up on scroll (outer); hover lifts the inner
 * surface with a shadow + border tinted in the persona's accent hue.
 */
const AudiencePersonaCard = memo(function AudiencePersonaCard({
  profile,
  index = 0,
}: {
  profile: ReturnType<typeof getAudienceProfiles>[number];
  index?: number;
}) {
  const accent = audienceAccents[profile.accent];
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="group relative h-full"
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: premiumEase }}
    >
      <motion.div
        className="relative flex h-full flex-col rounded-2xl bg-white border p-7 md:p-8"
        style={{
          borderColor: "rgba(15, 23, 42, 0.08)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
        whileHover={
          reduced
            ? undefined
            : {
                y: -6,
                borderColor: `rgba(${accent.rgb}, 0.35)`,
                boxShadow: `0 24px 50px -20px rgba(${accent.rgb}, 0.28), 0 8px 20px -12px rgba(15, 23, 42, 0.10)`,
              }
        }
        transition={{ duration: 0.3, ease: premiumEase }}
      >
        {/* Bare outline accent icon — like the reference */}
        <div
          className="mb-6 [&>svg]:h-9 [&>svg]:w-9"
          style={{ color: accent.hex }}
        >
          {profile.icon}
        </div>

        <h3 className="text-[1.35rem] font-bold text-gray-900 tracking-tight leading-snug">
          {profile.title}
        </h3>

        <p className="mt-3 text-[14.5px] text-gray-600 leading-[1.6]">
          {profile.solution}
        </p>

        {/* Ce que ça apporte — the concrete benefit, anchored to the bottom
            and kept deliberately understated. */}
        <div
          className="mt-6 flex items-center gap-2 border-t pt-4 text-[13px] font-semibold"
          style={{ color: accent.text, borderColor: "rgba(15, 23, 42, 0.07)" }}
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{profile.tag}</span>
        </div>
      </motion.div>
    </motion.div>
  );
});

function TargetAudienceSection() {
  const { t } = useLanguage();
  const AUDIENCE_PROFILES = getAudienceProfiles(t);

  return (
    <section
      id="audience"
      aria-label="Pour qui Posty"
      className="py-12 md:py-16 lg:py-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — single brand orange on the accent word, no gradient */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 80px 0px" }}
          transition={{ duration: 0.4, ease: premiumEase }}
          className="text-center mb-12 lg:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-gray-900">{t.landing.audienceTitle2}</span>{" "}
            <span className="text-[#F8935D]">{t.landing.audienceTitle3}</span>
          </h2>
        </motion.div>

        {/* Static 3-card grid — one persona per card (icon · title · copy). */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {AUDIENCE_PROFILES.map((profile, i) => (
            <AudiencePersonaCard key={i} profile={profile} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// AI EXPERIENCE SECTION — Explains the conversational AI copilot experience
// =============================================================================

function CopilotSectionWrapper() {
  const { t } = useLanguage();
  return <CopilotSection landing={t.landing} />;
}

function AIExperienceSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
      title: t.landing.aiExpFeature1Title,
      desc: t.landing.aiExpFeature1Desc,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
      title: t.landing.aiExpFeature2Title,
      desc: t.landing.aiExpFeature2Desc,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t.landing.aiExpFeature3Title,
      desc: t.landing.aiExpFeature3Desc,
    },
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left — Text content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, ease: premiumEase }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
              <span className="text-gray-900">{t.landing.aiExpTitle}</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                {t.landing.aiExpTitleAccent}
              </span>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
              {t.landing.aiExpSubtitle}
            </p>

            {/* Features list */}
            <div className="space-y-5">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: premiumEase }}
                  className="flex gap-3.5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#FEF3EE] text-[#F8935D] flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{f.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Mock chat interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px 60px 0px" }}
            transition={{ delay: 0.15, duration: 0.45, ease: premiumEase }}
            className="relative"
          >
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p translate="no" className="notranslate text-sm font-semibold text-gray-900">Posty AI</p>
              </div>

              {/* Chat messages */}
              <div className="px-5 py-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-gradient-to-r from-[#F8935D] to-[#F76B54] !text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-md">
                    {t.landing.aiExpChatExample}
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-gray-50 border border-gray-100 text-gray-700 text-sm px-4 py-3 rounded-2xl rounded-tl-md">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5 text-[#F8935D]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span translate="no" className="notranslate text-xs font-medium text-[#F8935D]">Posty AI</span>
                    </div>
                    <p className="leading-relaxed">{t.landing.aiExpChatResponse}</p>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-gray-400 flex-1">{t.landing.aiExpChatPlaceholder}</span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FEATURES SECTION - Premium SaaS Design with Distinct Colors
// =============================================================================
// Color Palette per Feature:
// 1. Green (Emerald) - Efficiency, automation, gain
// 2. Soft Orange (Amber) - Energy, adaptability, modernity
// 3. Violet (Purple) - Innovation, creativity, strategy
// 4. Coral Orange - Accessibility, speed, warmth
// =============================================================================

interface FeatureConfig {
  title: string;
  description: string;
  image?: string;
  mockup?: React.ReactNode;
  icon: React.ReactNode;
  color: {
    primary: string;      // Main color class
    bg: string;           // Background gradient
    border: string;       // Border color
    iconBg: string;       // Icon background
    iconText: string;     // Icon text color
    badge: string;        // Badge background
    badgeText: string;    // Badge text
    badgeDot?: string;    // Optional override for the pulsing dot (defaults to iconBg)
    glow: string;         // Glow effect
    accent: string;       // Accent details
    accentRgb: string;    // Accent as "R, G, B" for inline rgba() (cursor-tracked spotlight)
    titleGradient: string; // Title text gradient
  };
  badge: string;
  tierBadge?: string;     // Optional plan tier badge (e.g. "Max")
}

// =============================================================================
// FEATURE MOCKUPS — Mini app UI previews for each feature card
// =============================================================================

function MockupMultiPlatform() {
  const { t } = useLanguage();
  const platforms = [
    { name: "LinkedIn", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    ), color: "#0A66C2", selected: true, status: t.landing.featuresConnected || "Connecté" },
    { name: "Reddit", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.461 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.206-.095z"/></svg>
    ), color: "#FF4500", selected: true, status: t.landing.featuresComingSoon, comingSoon: true },
    { name: "Threads", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.10-1.14 3.531-1.208 1.027-.046 1.98.042 2.857.262-.085-.758-.286-1.373-.6-1.833-.453-.667-1.16-1.014-2.101-1.032h-.06c-.724.012-1.6.246-2.143.787l-1.46-1.39c.867-.913 2.09-1.39 3.553-1.416h.084c1.508.024 2.674.58 3.47 1.65.717.962 1.09 2.273 1.11 3.895l.003.236c.92.339 1.706.839 2.34 1.497.856.886 1.363 2.084 1.463 3.455.118 1.606-.36 3.244-1.39 4.747C18.86 22.812 16.13 23.98 12.186 24zm-1.14-8.376c-.94.042-1.672.284-2.173.72-.465.404-.685.905-.655 1.49.038.734.46 1.281 1.187 1.536.485.17 1.042.237 1.634.2 1.078-.06 1.884-.46 2.395-1.095.434-.54.704-1.28.81-2.216-.86-.2-1.791-.286-2.718-.286-.16 0-.32.003-.48.01z"/></svg>
    ), color: "#000000", selected: true, status: t.landing.featuresConnected || "Connecté" },
    { name: "Facebook", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ), color: "#1877F2", selected: true, status: t.landing.featuresConnected || "Connecté" },
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8935D]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F76B54]/8 rounded-full blur-2xl" />

      {/* Header - matches real app */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{t.landing.featuresPublishOn}</span>
      </div>

      {/* Platform grid - 2 columns like real app */}
      <div className="grid grid-cols-2 gap-2 relative z-10 flex-1">
        {platforms.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px 100px 0px" }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
            className="min-h-[72px] p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 relative"
            style={{
              backgroundColor: `${p.color}10`,
              borderColor: `${p.color}40`,
            }}
          >
            {/* Selection checkmark - top right like real app */}
            {p.selected && !("comingSoon" in p && p.comingSoon) && (
              <div className="absolute top-1.5 right-1.5">
                <svg className="w-4 h-4" style={{ color: p.color }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* "Bientôt" badge for Reddit */}
            {p.comingSoon && (
              <div className="absolute top-1 right-1">
                <span className="text-[8px] bg-gray-100 px-1 py-0.5 rounded text-gray-400">
                  {t.landing.featuresSoon}
                </span>
              </div>
            )}

            {/* Icon */}
            <div style={{ color: p.color }}>{p.icon}</div>

            {/* Name */}
            <span className="text-xs font-medium text-gray-900">{p.name}</span>

            {/* Status */}
            <span className={`text-[10px] ${p.comingSoon ? "text-gray-400" : "text-emerald-500"}`}>
              {p.status}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Upgrade link like real app */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px 100px 0px" }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="mt-3 relative z-10 flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-[11px] text-[#F8935D] font-medium">{t.landing.featuresUnlockMore}</span>
      </motion.div>
    </div>
  );
}

function MockupScheduler() {
  const { t } = useLanguage();
  const days = t.landing.featuresDays.split(",");
  // Posts scheduled on specific days with times
  const postsOnDays: Record<number, { time: string; status: "pending" | "published" }[]> = {
    3: [{ time: "09:00", status: "published" }],
    5: [{ time: "12:30", status: "published" }],
    8: [{ time: "09:00", status: "published" }, { time: "18:00", status: "published" }],
    10: [{ time: "14:00", status: "published" }],
    12: [{ time: "09:00", status: "published" }],
    13: [{ time: "10:00", status: "pending" }],
    15: [{ time: "09:00", status: "pending" }],
    17: [{ time: "12:00", status: "pending" }, { time: "18:00", status: "pending" }],
    19: [{ time: "09:00", status: "pending" }],
    22: [{ time: "14:30", status: "pending" }],
    24: [{ time: "09:00", status: "pending" }],
  };
  const today = 13;

  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-violet-500/8 rounded-full blur-3xl" />

      {/* View toggle - like real app */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-2.5 relative z-10">
        <div className="flex-1 px-2 py-1 text-[9px] font-medium rounded-md text-gray-500 text-center">
          {t.landing.featuresList}
        </div>
        <div className="flex-1 px-2 py-1 text-[9px] font-medium rounded-md bg-white text-gray-900 text-center shadow-sm">
          {t.landing.featuresCalendar}
        </div>
      </div>

      {/* Month navigation - like real app with < > arrows */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[11px] text-gray-900 font-bold">{t.landing.featuresMonth}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Calendar grid - like real app */}
      <div className="relative z-10 flex-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {days.map((d, i) => (
            <div key={d} className={`text-[8px] text-center font-semibold uppercase tracking-wider ${
              i === 0 || i === 6 ? "text-gray-300" : "text-gray-400"
            }`}>{d}</div>
          ))}
        </div>
        {/* Dates with posts inside cells - like real app */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty slots for days before Feb 1 (Saturday = 6 slots) */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[28px]" />
          ))}
          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
            const isToday = day === today;
            const dayPosts = postsOnDays[day];
            const hasPosts = !!dayPosts;
            return (
              <div
                key={day}
                className={`
                  min-h-[28px] p-0.5 rounded-lg flex flex-col items-start text-[9px] font-medium relative
                  ${isToday ? "bg-violet-500/10 border border-violet-500/30" : ""}
                  ${hasPosts && !isToday ? "border border-gray-200 bg-gray-50/80" : ""}
                  ${!hasPosts && !isToday ? "" : ""}
                `}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`
                    ${isToday ? "w-4 h-4 flex items-center justify-center bg-violet-500 text-white rounded text-[8px] font-bold" : ""}
                    ${!isToday ? "text-gray-500 text-[9px] pl-0.5" : ""}
                  `}>
                    {day}
                  </span>
                  {hasPosts && !isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-0.5" />
                  )}
                </div>
                {/* Post time pills inside cells - like real app */}
                {dayPosts && dayPosts.slice(0, 1).map((post, pi) => (
                  <div
                    key={pi}
                    className={`text-[6px] px-1 py-0 rounded mt-0.5 font-medium truncate w-full ${
                      post.status === "pending"
                        ? "bg-violet-500/10 text-violet-600"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {post.time}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MockupDualGeneration() {
  const { t } = useLanguage();
  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-red-400/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-400/5 rounded-full blur-2xl" />

      {/* Header - like real app "2 versions disponibles" with dots */}
      <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
        <span className="text-[10px] text-gray-400">{t.landing.featuresVersionsAvailable}</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F85751]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#F8935D]" />
        </div>
      </div>

      {/* Two version cards side by side - like real app grid */}
      <div className="flex gap-2 flex-1 relative z-10">
        {/* Storytelling - coral/accent like real app */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Gradient header bar like real app */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-[#F85751]/10 to-[#F85751]/5 border-b border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-[#F85751]/15 text-[#F85751] border border-[#F85751]/20">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {t.landing.featuresStorytelling}
            </span>
            <span className="text-[7px] font-bold text-emerald-600 tabular-nums">92</span>
          </div>
          {/* Content preview — fills the card with hook + body + tags + meta */}
          <div className="px-2.5 py-2 flex-1 flex flex-col gap-1.5">
            <p className="text-[8.5px] font-bold text-gray-900 leading-snug">
              Two years ago, I almost gave up on everything.
            </p>
            <div className="text-[7.5px] text-gray-500 leading-[1.55] line-clamp-6">
              {t.landing.featuresStorytellingPreview} I was burning out, my team was scattered, and every Monday felt heavier than the last. Then I changed one thing — and everything shifted.
            </div>
            <div className="flex items-center gap-1 mt-auto pt-1">
              <span className="text-[6.5px] text-[#0A66C2] font-medium">#story</span>
              <span className="text-[6.5px] text-[#0A66C2] font-medium">#founder</span>
            </div>
            <div className="flex items-center justify-between text-[6.5px] text-gray-400 tabular-nums border-t border-gray-50 pt-1">
              <span>~3.2k reach</span>
              <span className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[#F85751]" />
                emotional
              </span>
            </div>
          </div>
          {/* Actions like real app */}
          <div className="px-2 py-1.5 border-t border-gray-100 flex gap-1">
            <div className="flex-1 py-1 rounded text-center text-[7px] text-gray-500 bg-gray-50 font-medium">{t.landing.featuresCopy}</div>
            <div className="flex-1 py-1 rounded text-center text-[7px] text-white bg-[#0A66C2] font-medium">{t.landing.featuresPublish}</div>
          </div>
        </motion.div>

        {/* Business - primary/orange like real app */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Gradient header bar like real app */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-[#F8935D]/10 to-[#F8935D]/5 border-b border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-[#F8935D]/15 text-[#F8935D] border border-[#F8935D]/20">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t.landing.featuresBusiness}
            </span>
            <span className="text-[7px] font-bold text-emerald-600 tabular-nums">88</span>
          </div>
          {/* Content preview — same density treatment as Storytelling */}
          <div className="px-2.5 py-2 flex-1 flex flex-col gap-1.5">
            <p className="text-[8.5px] font-bold text-gray-900 leading-snug">
              3 strategies that drove +40% B2B leads.
            </p>
            <div className="text-[7.5px] text-gray-500 leading-[1.55] line-clamp-6">
              {t.landing.featuresBusinessPreview} Each one is repeatable, measurable, and works without paid ads. Save this if you want a step-by-step framework.
            </div>
            <div className="flex items-center gap-1 mt-auto pt-1">
              <span className="text-[6.5px] text-[#0A66C2] font-medium">#B2B</span>
              <span className="text-[6.5px] text-[#0A66C2] font-medium">#growth</span>
            </div>
            <div className="flex items-center justify-between text-[6.5px] text-gray-400 tabular-nums border-t border-gray-50 pt-1">
              <span>~5.8k reach</span>
              <span className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[#F8935D]" />
                actionable
              </span>
            </div>
          </div>
          {/* Actions like real app */}
          <div className="px-2 py-1.5 border-t border-gray-100 flex gap-1">
            <div className="flex-1 py-1 rounded text-center text-[7px] text-gray-500 bg-gray-50 font-medium">{t.landing.featuresCopy}</div>
            <div className="flex-1 py-1 rounded text-center text-[7px] text-white bg-[#0A66C2] font-medium">{t.landing.featuresPublish}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MockupContextProfile() {
  const { t } = useLanguage();
  const profileFields = [
    { label: t.landing.featuresSector, value: t.landing.featuresSectorValue, icon: "🏢" },
    { label: t.landing.featuresAudience, value: t.landing.featuresAudienceValue, icon: "🎯" },
    { label: t.landing.featuresTone, value: t.landing.featuresToneValue, icon: "🎤" },
    { label: t.landing.featuresStyle, value: t.landing.featuresStyleValue, icon: "✍️" },
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <span className="text-[11px] text-gray-500 font-medium">{t.landing.featuresYourProfile}</span>
        <span className="ml-auto text-[10px] text-emerald-500 font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          {t.landing.featuresCompleted}
        </span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-3 relative z-10 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-amber-500/20">
          EN
        </div>
        <div>
          <div className="text-[12px] text-gray-900 font-semibold">{t.landing.featuresProfileName}</div>
          <div className="text-[10px] text-gray-500">{t.landing.featuresProfileRole}</div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-2 flex-1 relative z-10">
        {profileFields.map((field, i) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px 0px 100px 0px" }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
            className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
          >
            <span className="text-sm flex-shrink-0">{field.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-gray-400 uppercase tracking-wider">{field.label}</div>
              <div className="text-[11px] text-gray-800 font-medium truncate">{field.value}</div>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Completion bar */}
      <div className="mt-3 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-gray-400">{t.landing.featuresPersonalization}</span>
          <span className="text-[9px] text-amber-500 font-semibold">100%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true, margin: "0px 0px 100px 0px" }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function getFeatures(t: Translations): FeatureConfig[] {
  return [
  {
    title: t.landing.featuresMultiPlatformTitle,
    description: t.landing.featuresMultiPlatformDesc,
    mockup: <MockupMultiPlatform />,
    badge: "",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    color: {
      primary: "orange",
      bg: "from-orange-50/70 via-white to-[#FBB9AD]/20",
      border: "border-orange-200 hover:border-[#F8935D]",
      iconBg: "bg-gradient-to-br from-[#F8935D] to-[#F76B54]",
      iconText: "text-white",
      badge: "bg-gradient-to-r from-[#F8935D] to-[#F76B54]",
      badgeText: "text-white",
      badgeDot: "bg-white",
      glow: "shadow-[#F8935D]/20",
      accent: "text-[#F76B54]",
      accentRgb: "248, 147, 93",
      titleGradient: "from-[#F8935D] via-[#FBB9AD] to-slate-300",
    },
  },
  {
    title: t.landing.featuresScheduleTitle,
    description: t.landing.featuresScheduleDesc,
    mockup: <MockupScheduler />,
    badge: "",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: {
      primary: "violet",
      bg: "from-violet-50 via-white to-purple-50/50",
      border: "border-violet-200 hover:border-violet-400",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      iconText: "text-white",
      badge: "bg-violet-100",
      badgeText: "text-violet-700",
      glow: "shadow-violet-500/20",
      accent: "text-violet-600",
      accentRgb: "139, 92, 246",
      titleGradient: "from-violet-600 via-purple-400 to-slate-300",
    },
  },
  {
    title: t.landing.featuresGenerationTitle,
    description: t.landing.featuresGenerationDesc,
    mockup: <MockupDualGeneration />,
    badge: "",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: {
      primary: "emerald",
      bg: "from-emerald-50 via-white to-green-50/50",
      border: "border-emerald-200 hover:border-emerald-400",
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-600",
      iconText: "text-white",
      badge: "bg-emerald-100",
      badgeText: "text-emerald-700",
      glow: "shadow-emerald-500/20",
      accent: "text-emerald-600",
      accentRgb: "16, 185, 129",
      titleGradient: "from-emerald-600 via-emerald-400 to-slate-300",
    },
  },
  {
    title: t.landing.featuresPersonalizationTitle,
    description: t.landing.featuresPersonalizationDesc,
    mockup: <MockupContextProfile />,
    badge: "",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: {
      primary: "amber",
      bg: "from-amber-50 via-white to-orange-50/50",
      border: "border-amber-200 hover:border-amber-400",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      iconText: "text-white",
      badge: "bg-amber-100",
      badgeText: "text-amber-700",
      glow: "shadow-amber-500/20",
      accent: "text-amber-600",
      accentRgb: "245, 158, 11",
      titleGradient: "from-amber-600 via-orange-400 to-slate-300",
    },
  },
  ];
}

function FeatureCard({ feature, index }: { feature: FeatureConfig; index: number }) {
  const { t } = useLanguage();
  const isEven = index % 2 === 0;
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  // Cursor-tracked spotlight — same vocabulary as ValueCard ("Pourquoi les
  // indépendants choisissent Posty") so both sections feel like a single
  // hover language. Radius is larger here (~460px) because feature cards
  // are wider than value cards, so the highlight reads at the same density.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(460px circle at ${mx}px ${my}px, rgba(${feature.color.accentRgb}, 0.18), transparent 65%)`;

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = cardRef.current;
      if (!el || prefersReducedMotion || isMobile) return;
      const rect = el.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    },
    [mx, my, prefersReducedMotion, isMobile],
  );

  // 3D perspective tilt — desktop only, driven by cursor position
  // DISABLED: kept for reference, re-enable by restoring handlers + style props below.
  // const mouseX = useMotionValue(0.5);
  // const mouseY = useMotionValue(0.5);
  // const rawRotateX = useTransform(mouseY, [0, 1], [3, -3]);
  // const rawRotateY = useTransform(mouseX, [0, 1], [-3, 3]);
  // const rotateX = useSpring(rawRotateX, { stiffness: 100, damping: 26, restDelta: 0.001 });
  // const rotateY = useSpring(rawRotateY, { stiffness: 100, damping: 26, restDelta: 0.001 });
  //
  // const handleMouseMove = useCallback((e: React.MouseEvent) => {
  //   const card = cardRef.current;
  //   if (!card || prefersReducedMotion || isMobile) return;
  //   const rect = card.getBoundingClientRect();
  //   const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  //   const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  //   mouseX.set(nx);
  //   mouseY.set(ny);
  // }, [mouseX, mouseY, prefersReducedMotion, isMobile]);
  //
  // const handleMouseLeave = useCallback(() => {
  //   mouseX.set(0.5);
  //   mouseY.set(0.5);
  // }, [mouseX, mouseY]);

  // Strip hover: classes from border string on mobile
  const borderClasses = isMobile
    ? feature.color.border.replace(/hover:\S+/g, "")
    : feature.color.border;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={isMobile ? undefined : onMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 100px 0px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      // 3D tilt disabled — re-enable by restoring:
      // onMouseMove={isMobile ? undefined : handleMouseMove}
      // onMouseLeave={isMobile ? undefined : handleMouseLeave}
      // style={isMobile ? undefined : { perspective: 1200 }}
      className={isMobile ? "" : "group/card"}
    >
      <motion.div
        // 3D tilt disabled — re-enable by restoring:
        // style={isMobile ? undefined : {
        //   rotateX: prefersReducedMotion ? 0 : rotateX,
        //   rotateY: prefersReducedMotion ? 0 : rotateY,
        //   transformStyle: "preserve-3d",
        // }}
        className={`
          relative isolate bg-gradient-to-br ${feature.color.bg}
          border ${borderClasses} rounded-[clamp(1rem,2vw,1.5rem)]
          px-[clamp(1.25rem,2.5vw,2rem)] py-[clamp(1rem,1.8vw,1.5rem)]
          shadow-sm ${isMobile ? '' : `hover:shadow-xl ${feature.color.glow}`}
          transition-shadow duration-300
        `}
      >
        {/* Cursor-tracked spotlight — desktop only.
            Clipped to the card's rounded corners via its own overflow-hidden
            so the gradient stays inside the visible card outline; sits behind
            content (-z-[1]) and is pointer-transparent so it never steals
            hover. Re-uses the same vocabulary as ValueCard (Why-choose section). */}
        {!isMobile && !prefersReducedMotion && (
          <motion.div
            aria-hidden
            style={{ background: spotlight }}
            className="pointer-events-none absolute inset-0 -z-[1] rounded-[clamp(1rem,2vw,1.5rem)] overflow-hidden opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
          />
        )}

        {/* Inner flex layout: image + content.
            Mobile: `flex-col-reverse` → content first then mockup (faster scan).
            Desktop: alternating left/right per `isEven`. */}
        <div className={`relative z-10 flex flex-col-reverse ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-[clamp(1.5rem,3vw,2rem)] items-center`}>

        {/* Visual — Centered Mockup — overflows card vertically for premium feel */}
        <div className="w-full lg:w-[42%] flex-shrink-0 flex items-center justify-center relative lg:my-[clamp(-1.5rem,-2vw,-2.5rem)]">

          {/* App mockup — compact, uniform size */}
          {feature.mockup && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px 100px 0px" }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-[4] w-full"
              style={{ maxWidth: "clamp(13rem, 22vw, 20rem)" }}
            >
              <div
                className="w-full rounded-xl overflow-hidden shadow-xl ring-1 ring-black/[0.08]"
                style={{ aspectRatio: "4 / 5", transform: isEven ? "rotate(2deg)" : "rotate(-2deg)" }}
              >
                {feature.mockup}
              </div>
            </motion.div>
          )}

          {/* Badges — floating above everything */}
          <div className={`absolute top-2 z-20 flex items-center gap-2 ${isEven ? "left-0" : "right-0"}`}>
            {feature.badge && (
              <span
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  ${feature.color.badge} ${feature.color.badgeText}
                  text-xs font-semibold shadow-lg
                `}
              >
                <span className={`w-2 h-2 rounded-full ${feature.color.badgeDot ?? feature.color.iconBg} animate-pulse`} />
                {feature.badge}
              </span>
            )}
            {feature.tierBadge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-amber-500/30 ring-1 ring-white/20">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {feature.tierBadge}
              </span>
            )}
          </div>

        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          {/* Icon */}
          <div
            className={`
              inline-flex items-center justify-center w-[clamp(2.75rem,3.5vw,3.5rem)] h-[clamp(2.75rem,3.5vw,3.5rem)] rounded-[clamp(0.75rem,1.2vw,1rem)]
              ${feature.color.iconBg} ${feature.color.iconText}
              shadow-lg ${feature.color.glow}
              mb-[clamp(0.75rem,1.5vw,1rem)]
            `}
          >
            {feature.icon}
          </div>

          {/* Title */}
          <h3 className={`text-[clamp(1.2rem,2.5vw,1.875rem)] font-bold mb-[clamp(0.5rem,1vw,0.75rem)] leading-[1.3] pb-[0.15em] text-transparent bg-clip-text bg-gradient-to-r ${feature.color.titleGradient}`}>
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-[clamp(0.9rem,1.2vw,1.125rem)] leading-relaxed mb-[clamp(1rem,1.5vw,1.25rem)]">
            {feature.description}
          </p>

          {/* CTA Link with arrow slide on hover — hidden on mobile (the
              feature cards already share a single global CTA below). */}
          <div className="hidden sm:block">
            <Link
              href="/signup"
              className={`
                inline-flex items-center gap-2 font-semibold
                ${feature.color.accent}
                transition-colors duration-300
                group/link relative
              `}
            >
              <span className="relative">
                {t.landing.featuresTryFree}
                <span className={`absolute -bottom-0.5 left-0 w-0 h-[2px] ${feature.color.iconBg} transition-all duration-300 group-hover/link:w-full`} />
              </span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * SectionTitle — premium H2 with word-by-word reveal on scroll.
 *
 * Why a dedicated component:
 *   • Section H2s on the warm peach landing were using `text-silver-premium`
 *     (light-gray gradient) which washed out badly. The CSS class is now
 *     dark-ink shimmer, but we also want the *motion* signature: words
 *     stagger in from below, the brand keyword (LinkedIn) lands in orange.
 *   • Splits the title on the highlight token so any language works as long
 *     as the keyword appears in the i18n string.
 *
 * Animation budget: 0.4s per word reveal, 60ms stagger, ease [0.22,1,0.36,1].
 * Triggers once on scroll into view.
 */
function SectionTitle({
  text,
  highlight,
  className = "",
}: {
  text: string;
  highlight?: string;
  className?: string;
}) {
  /* Split the title into renderable tokens, isolating the highlight word so
   * we can paint it in brand orange. Whitespace-preserving split. */
  const tokens: { word: string; isHighlight: boolean }[] = [];
  if (highlight && text.includes(highlight)) {
    const parts = text.split(highlight);
    parts.forEach((part, i) => {
      part.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ word: w, isHighlight: false }));
      if (i < parts.length - 1) tokens.push({ word: highlight, isHighlight: true });
    });
  } else {
    text.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ word: w, isHighlight: false }));
  }

  return (
    <motion.h2
      className={`text-[clamp(1.75rem,4vw,3.25rem)] font-bold tracking-tight leading-[1.12] ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
    >
      {tokens.map((t, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={`inline-block ${t.isHighlight ? "text-[#F8935D]" : "text-silver-premium"}`}
        >
          {t.word}
          {i < tokens.length - 1 && " "}
        </motion.span>
      ))}
    </motion.h2>
  );
}

function FeaturesSection() {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const FEATURES = getFeatures(t);

  return (
    <section id="features" className="py-[clamp(1.5rem,3vw,2.5rem)] px-[clamp(1rem,4vw,3rem)] overflow-hidden">
      <div className="w-full max-w-[min(90vw,67.75rem)] mx-auto">
        <div className="text-center mb-[clamp(1.25rem,2vw,1.75rem)]">
          <SectionTitle text={t.landing.featuresSectionTitle} highlight="LinkedIn" />
        </div>

        {/* How it works — first feature card, right after title */}
        <HowItWorksSection />

        {/* Features Grid with Connectors */}
        <div className="relative space-y-[clamp(1.25rem,2vw,1.75rem)]">
          {/* Vertical connector line — desktop only */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "0px 0px 100px 0px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="w-0.5 h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent origin-top mx-auto"
            />
          </div>

          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="relative">
              <FeatureCard feature={feature} index={index} />
            </div>
          ))}
        </div>

        {/* Featured client testimonial — sibling of the feature cards above */}
        <CeriseSpotlight />

      </div>
    </section>
  );
}

// =============================================================================
// VALUE BLOCK — Premium value proposition after Features
// =============================================================================

// Single card with cursor-tracking radial glow + magnetic hover
type ValueItem = {
  title: string;
  desc: string;
  gradientBg: string;
  borderColor: string;
  iconGradient: string;
  accentColor: string;
  accentRgb: string; // "248,147,93" — used in inline rgba()
  icon: React.ReactNode;
};

function ValueCard({ item, index }: { item: ValueItem; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Cursor-tracked spotlight
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(${item.accentRgb}, 0.18), transparent 65%)`;

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el || prefersReducedMotion || isMobile) return;
    const rect = el.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }, [mx, my, prefersReducedMotion, isMobile]);

  const numberLabel = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: premiumEase,
      }}
      whileHover={isMobile ? undefined : {
        y: -6,
        transition: { type: "spring", stiffness: 320, damping: 24 },
      }}
      className={`
        group relative isolate overflow-hidden
        rounded-[clamp(1rem,1.6vw,1.4rem)]
        bg-gradient-to-br ${item.gradientBg}
        border ${item.borderColor}
        p-[clamp(1.25rem,2vw,1.75rem)]
        shadow-[0_1px_2px_rgba(15,23,42,0.04),0_0_0_1px_rgba(15,23,42,0.02)]
        transition-shadow duration-500
        hover:shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18),0_8px_24px_-12px_rgba(15,23,42,0.10)]
      `}
    >
      {/* Cursor-tracked spotlight overlay */}
      {!isMobile && !prefersReducedMotion && (
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 -z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
      )}

      {/* Top edge highlight — refined detail */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${item.accentColor}55, transparent)` }}
      />

      <div className="relative z-10">
        {/* Header row: icon + numeric mark */}
        <div className="flex items-start justify-between mb-5">
          <motion.div
            whileHover={isMobile ? undefined : { rotate: -4, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className={`
              relative w-12 h-12 rounded-xl
              bg-gradient-to-br ${item.iconGradient}
              flex items-center justify-center
              shadow-[0_8px_20px_-6px_rgba(0,0,0,0.20)]
            `}
          >
            {/* Icon glossy ring */}
            <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
            {item.icon}
          </motion.div>

          <span
            aria-hidden
            className="font-mono text-[0.68rem] tracking-[0.2em] uppercase text-gray-400/90 mt-1"
          >
            {numberLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[clamp(1.05rem,1.55vw,1.2rem)] font-semibold text-gray-900 leading-snug">
          {item.title}
        </h3>

        {/* Animated accent rule under title */}
        <motion.span
          aria-hidden
          className="block h-[2px] rounded-full mt-2.5 origin-left"
          style={{ background: `linear-gradient(90deg, ${item.accentColor}, transparent)` }}
          initial={{ scaleX: 0, width: "44%" }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.25 + index * 0.08, ease: premiumEase }}
        />

        {/* Description */}
        <p className="mt-4 text-[clamp(0.85rem,1.15vw,0.95rem)] text-gray-600 leading-relaxed">
          {item.desc}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * ZigzagConnector — premium S-curve drawn between two stacked ValueCards.
 *
 * - SVG path animates pathLength 0→1 via Framer Motion when the connector
 *   scrolls into view (whileInView, fires once).
 * - A linearGradient on the stroke transitions from the previous card's
 *   accent into the next card's, so the connector visually "passes the baton".
 * - A landing dot scales in at the path endpoint after the line completes.
 * - preserveAspectRatio="none" stretches the viewBox to the container, and
 *   non-scaling-stroke keeps the 1.5px line crisp at any width.
 * - Hidden below md: vertical hairline + chevron is a sufficient mobile cue.
 */
function ZigzagConnector({
  direction,
  accentColor,
  accentRgb,
  nextAccentColor,
}: {
  direction: "left-to-right" | "right-to-left";
  accentColor: string;
  accentRgb: string;
  nextAccentColor: string;
}) {
  const isLTR = direction === "left-to-right";
  // Path travels from the bottom edge of the previous card down to the top
  // edge of the next card — anchored at 26% / 74% which line up with the
  // center of the 52% wide cards on each side.
  const path = isLTR
    ? "M 26 0 C 26 55, 74 45, 74 100"
    : "M 74 0 C 74 55, 26 45, 26 100";
  const endX = isLTR ? 74 : 26;
  // Unique gradient id so multiple connectors don't collide.
  const gradId = `zigzag-grad-${isLTR ? "ltr" : "rtl"}-${accentColor.replace("#", "")}`;

  return (
    <>
      {/* ── Desktop: animated SVG curve ─────────────────────────────── */}
      <div
        className="relative h-24 md:h-32 -my-4 hidden md:block pointer-events-none"
        aria-hidden
      >
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient
              id={gradId}
              x1={isLTR ? "0%" : "100%"}
              y1="0%"
              x2={isLTR ? "100%" : "0%"}
              y2="100%"
            >
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={nextAccentColor} stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <motion.path
            d={path}
            stroke={`url(#${gradId})`}
            strokeWidth={1.5}
            strokeDasharray="2.5 2"
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        {/* Endpoint dot — scales in once the path finishes drawing. */}
        <motion.div
          className="absolute"
          style={{
            left: `${endX}%`,
            top: "100%",
            transform: "translate(-50%, -50%)",
          }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 0.4, delay: 0.95, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div
            className="w-3 h-3 rounded-full ring-4"
            style={{
              backgroundColor: nextAccentColor,
              boxShadow: `0 6px 16px -4px rgba(${accentRgb}, 0.45)`,
              // ring-* utility uses --tw-ring-color; inline workaround for arbitrary rgba()
              ["--tw-ring-color" as string]: `rgba(${accentRgb}, 0.18)`,
            }}
          />
        </motion.div>
      </div>

      {/* ── Mobile: subtle vertical link with chevron ───────────────── */}
      <div
        className="md:hidden flex flex-col items-center justify-center py-3"
        aria-hidden
      >
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-px h-6 origin-top"
          style={{
            background: `linear-gradient(to bottom, ${accentColor}55, ${nextAccentColor}55)`,
          }}
        />
        <motion.svg
          initial={{ opacity: 0, y: -4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="w-3 h-3 mt-0.5"
          fill="none"
          stroke={nextAccentColor}
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </motion.svg>
      </div>
    </>
  );
}

// =============================================================================
// VALUE METRICS MARQUEE — two-row infinite carousel of result cards (replaces
// the static zigzag for motion-enabled users). Vivid brand-spectrum gradient
// cards, each: big metric + label + platform + name. Reuses the proven
// AudienceMarquee mechanics (marqueeValue keyframe, ×2 duplication for a
// seamless −50% loop; row 2 runs in reverse).
// NOTE: metrics + names are ILLUSTRATIVE examples — swap for real, verifiable
// customer data before treating them as social proof.
// =============================================================================

type ValuePlatform = "linkedin" | "mastodon" | "threads" | "discord";

const VALUE_PLATFORMS: Record<ValuePlatform, { color: string; glyph: React.ReactNode }> = {
  linkedin: {
    color: "#0A66C2",
    glyph: (
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    ),
  },
  mastodon: {
    color: "#6364FF",
    glyph: (
      <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
    ),
  },
  threads: {
    color: "#000000",
    glyph: (
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.751-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.475 7.825c.98-1.452 2.568-2.248 4.583-2.248h.043c3.357.024 5.36 2.082 5.694 5.84.191.082.376.169.557.262 1.886.93 3.266 2.272 3.953 3.872.83 1.93.96 4.85-1.357 7.16-1.77 1.766-3.92 2.563-6.762 2.583z" />
    ),
  },
  discord: {
    color: "#5865F2",
    glyph: (
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    ),
  },
};

function ValuePlatformGlyph({ platform }: { platform: ValuePlatform }) {
  const meta = VALUE_PLATFORMS[platform];
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={meta.color} aria-hidden="true">
      {meta.glyph}
    </svg>
  );
}

type ValueMetric = {
  metric: string;
  label: string;
  name: string;
  platform: ValuePlatform;
  gradient: string;
  rgb: string;
};

// Warm→cool brand spectrum (orange → coral → rose → fuchsia → violet → indigo),
// echoing the reference carousel's blue→purple→magenta flow but on-brand.
const VALUE_SPECTRUM: { gradient: string; rgb: string }[] = [
  { gradient: "from-[#F8935D] to-[#F76B54]", rgb: "248,147,93" },
  { gradient: "from-[#F76B54] to-[#F1456A]", rgb: "247,107,84" },
  { gradient: "from-[#F1456A] to-[#D9268C]", rgb: "241,69,106" },
  { gradient: "from-[#C42AC9] to-[#9333EA]", rgb: "168,45,200" },
  { gradient: "from-[#8B3DEC] to-[#6366F1]", rgb: "124,58,237" },
  { gradient: "from-[#5B61F1] to-[#3B82F6]", rgb: "79,70,229" },
];

function getValueMetrics(t: Translations): [ValueMetric[], ValueMetric[]] {
  const s = VALUE_SPECTRUM;
  const all: Omit<ValueMetric, "gradient" | "rgb">[] = [
    { metric: "×4",    label: t.landing.valueMetricLabel1,  name: "Camille B.", platform: "linkedin" },
    { metric: "+180%", label: t.landing.valueMetricLabel2,  name: "Thomas L.",  platform: "mastodon" },
    { metric: "+3k",   label: t.landing.valueMetricLabel3,  name: "Sarah M.",   platform: "linkedin" },
    { metric: "+50%",  label: t.landing.valueMetricLabel4,  name: "Julien R.",  platform: "threads" },
    { metric: "−12h",  label: t.landing.valueMetricLabel5,  name: "Léa D.",     platform: "discord" },
    { metric: "+220%", label: t.landing.valueMetricLabel6,  name: "Maxime P.",  platform: "mastodon" },
    { metric: "+90",   label: t.landing.valueMetricLabel7,  name: "Inès K.",    platform: "linkedin" },
    { metric: "×3",    label: t.landing.valueMetricLabel8,  name: "Antoine V.", platform: "threads" },
    { metric: "+40%",  label: t.landing.valueMetricLabel9,  name: "Chloé F.",   platform: "discord" },
    { metric: "+5k",   label: t.landing.valueMetricLabel10, name: "Raphaël T.", platform: "linkedin" },
    { metric: "+30%",  label: t.landing.valueMetricLabel11, name: "Nadia S.",   platform: "mastodon" },
    { metric: "×2",    label: t.landing.valueMetricLabel12, name: "Hugo M.",    platform: "discord" },
  ];
  const withColor: ValueMetric[] = all.map((m, i) => ({ ...m, ...s[i % s.length] }));
  return [withColor.slice(0, 6), withColor.slice(6)];
}

const ValueMetricCard = memo(function ValueMetricCard({ item }: { item: ValueMetric }) {
  return (
    // CSS-only hover lift (no Framer transform — it would fight the marquee's
    // CSS translateX on the parent track and make the card jump off-screen).
    <div className="group relative w-[210px] flex-shrink-0 transition-transform duration-300 ease-out will-change-transform [@media(hover:hover)]:hover:-translate-y-1.5">
      <div
        className={`relative h-full overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${item.gradient}`}
        style={{ boxShadow: `0 14px 34px -16px rgba(${item.rgb}, 0.6)` }}
      >
        {/* Soft top sheen — premium gloss without washing out the gradient */}
        <div aria-hidden className="pointer-events-none absolute -top-1/3 -right-1/4 h-2/3 w-2/3 rounded-full bg-white/15 blur-2xl" />

        <div className="relative">
          <p className="text-[2rem] font-extrabold leading-none tracking-tight text-white">
            {item.metric}
          </p>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white/90">
            {item.label}
          </p>
        </div>

        <div className="relative mt-5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
            <ValuePlatformGlyph platform={item.platform} />
          </span>
          <span className="text-[12.5px] font-semibold text-white/95">{item.name}</span>
        </div>
      </div>
    </div>
  );
});

function ValueBlock() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [metricsRow1, metricsRow2] = getValueMetrics(t);

  const items: ValueItem[] = [
    {
      title: t.landing.valueBlockItem1Title,
      desc: t.landing.valueBlockItem1Desc,
      gradientBg: "from-[#FFF7F2] via-[#FFEDE3] to-[#FFE0D0]",
      borderColor: "border-[#F8935D]/25 hover:border-[#F8935D]/55",
      iconGradient: "from-[#F8935D] to-[#F76B54]",
      accentColor: "#F8935D",
      accentRgb: "248,147,93",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
    {
      title: t.landing.valueBlockItem2Title,
      desc: t.landing.valueBlockItem2Desc,
      gradientBg: "from-[#FFF2F5] via-[#FFE4EB] to-[#FFD5DF]",
      borderColor: "border-[#F13452]/20 hover:border-[#F13452]/45",
      iconGradient: "from-[#F13452] to-[#D91E3D]",
      accentColor: "#F13452",
      accentRgb: "241,52,82",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      title: t.landing.valueBlockItem3Title,
      desc: t.landing.valueBlockItem3Desc,
      gradientBg: "from-[#F5F0FF] via-[#EDE5FF] to-[#E0D4FF]",
      borderColor: "border-violet-300/35 hover:border-violet-400/65",
      iconGradient: "from-violet-500 to-purple-600",
      accentColor: "#7C3AED",
      accentRgb: "124,58,237",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: t.landing.valueBlockItem4Title,
      desc: t.landing.valueBlockItem4Desc,
      gradientBg: "from-[#EEFFF7] via-[#DCFCE7] to-[#CCFBDA]",
      borderColor: "border-emerald-300/35 hover:border-emerald-400/65",
      iconGradient: "from-emerald-500 to-green-600",
      accentColor: "#059669",
      accentRgb: "5,150,105",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-[clamp(2.5rem,5vw,4.5rem)] px-[clamp(1rem,4vw,3rem)] overflow-hidden">
      {/* Ambient backdrop wash — reinforces premium atmosphere without changing layout */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[1]">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[820px] h-[420px] bg-gradient-to-b from-[#F8935D]/8 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-[min(90vw,67.75rem)] mx-auto">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.5, ease: premiumEase }}
          className="text-center mb-[clamp(1.75rem,3vw,2.75rem)]"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.015em]">
            <span className="text-silver-premium">{t.landing.valueBlockTitle}</span>
          </h2>
          <p className="mt-4 text-[clamp(0.95rem,1.3vw,1.1rem)] text-gray-500 max-w-2xl mx-auto">
            {t.landing.valueBlockSubtitle}
          </p>
        </motion.div>

        {/* Motion-enabled: two-row infinite results carousel (à la the
            reference). Reduced-motion: the original zigzag value cards, which
            carry the same "why" message without any horizontal scroll. */}
        {reduced ? (
          <div className="relative">
            {items.map((item, i) => {
              const isLeft = i % 2 === 0;
              const isLast = i === items.length - 1;
              return (
                <div key={i}>
                  <div
                    className={`md:w-[52%] ${
                      isLeft ? "md:mr-auto md:pr-4" : "md:ml-auto md:pl-4"
                    }`}
                  >
                    <ValueCard item={item} index={i} />
                  </div>

                  {!isLast && (
                    <ZigzagConnector
                      direction={isLeft ? "left-to-right" : "right-to-left"}
                      accentColor={item.accentColor}
                      accentRgb={item.accentRgb}
                      nextAccentColor={items[i + 1].accentColor}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Edge fade via mask-image — dissolves the cards into whatever is
                behind them, so it stays clean on any background (a coloured
                overlay looked dirty against the pink wash). py-3 gives the
                hover lift room so it isn't clipped. */}
            {/* Row 1 — drifts left */}
            <div
              className="overflow-hidden py-3"
              style={{
                maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
              }}
            >
              <div
                className="flex w-max gap-4 animate-marquee-value [@media(hover:hover)]:hover:[animation-play-state:paused]"
                style={{ willChange: "transform", backfaceVisibility: "hidden", animationDuration: "44s" }}
              >
                {[...metricsRow1, ...metricsRow1].map((m, i) => (
                  <ValueMetricCard key={i} item={m} />
                ))}
              </div>
            </div>

            {/* Row 2 — drifts right (reverse) */}
            <div
              className="overflow-hidden py-3"
              style={{
                maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
              }}
            >
              <div
                className="flex w-max gap-4 animate-marquee-value [@media(hover:hover)]:hover:[animation-play-state:paused]"
                style={{ willChange: "transform", backfaceVisibility: "hidden", animationDuration: "52s", animationDirection: "reverse" }}
              >
                {[...metricsRow2, ...metricsRow2].map((m, i) => (
                  <ValueMetricCard key={i} item={m} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA — shimmer sweep + spring scale */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -60px 0px" }}
          transition={{ duration: 0.45, delay: 0.15, ease: premiumEase }}
          className="text-center mt-[clamp(1.75rem,3vw,2.75rem)]"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="inline-block"
          >
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35 transition-shadow duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out pointer-events-none" />
              <span className="relative">{t.landing.valueBlockCTA}</span>
              <svg className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// TESTIMONIALS SECTION - Premium Design with Free Stock Photos
// =============================================================================
// Images libres de droits recommandees (Unsplash):
// - Homme d'affaires: https://unsplash.com/photos/sibVwORYqs0 (Austin Distel)
// - Femme marketing: https://unsplash.com/photos/SJvDxw0azqw (Christina @ wocintechchat.com)
// - Consultant: https://unsplash.com/photos/7YVZYZeITc8 (LinkedIn Sales Solutions)
// =============================================================================

function getTestimonials(t: Translations) {
  return [
    {
      name: "Raffaël Bounous",
      role: t.landing.testimonial1Role,
      company: t.landing.testimonial1Company,
      image: "",
      quote: t.landing.testimonial1Text,
    },
    {
      name: "Louis Bruyas",
      role: t.landing.testimonial2Role,
      company: t.landing.testimonial2Company,
      image: "",
      quote: t.landing.testimonial2Text,
    },
    {
      name: "Cerise Cottier",
      role: t.landing.testimonial3Role,
      company: "",
      image: "/images/team/cerise-cottier.jpg",
      quote: t.landing.testimonial3Text,
    },
  ];
}

function getTestimonialInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TestimonialAvatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image?: string;
  size?: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    );
  }
  const fontClass = size <= 24 ? "text-[9px]" : "text-sm";
  return (
    <div
      aria-hidden="true"
      className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F8935D]/20 to-[#F76B54]/25 text-[#F76B54] font-semibold ${fontClass}`}
    >
      {getTestimonialInitials(name)}
    </div>
  );
}

/**
 * PremiumTestimonialCard — single card. Lives outside the section so the
 * cursor-tracked spotlight and per-card MotionValues don't re-render the
 * whole grid on every mousemove.
 *
 * Premium signals (in order of impact):
 *  1. Cursor-tracked radial spotlight on hover (Framer MotionTemplate)
 *  2. Big decorative serif quote mark, gradient-clipped, top-right
 *  3. Top hairline accent, brightens on hover (color baton vocabulary)
 *  4. Stars stagger-in with a spring overshoot (rotate + scale + opacity)
 *  5. Avatar with brand gradient halo ring + emerald verified badge
 *  6. Hover lifts -8px with intensified orange-tinted shadow
 */
function PremiumTestimonialCard({
  testimonial,
  isMobile,
  prefersReducedMotion,
}: {
  testimonial: ReturnType<typeof getTestimonials>[number];
  isMobile: boolean;
  prefersReducedMotion: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Cursor spotlight — same pattern proven on the ValueBlock cards.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(248, 147, 93, 0.12), transparent 65%)`;

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = cardRef.current;
      if (!el || prefersReducedMotion || isMobile) return;
      const rect = el.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    },
    [mx, my, prefersReducedMotion, isMobile],
  );

  // Card variant — used inside the parent's stagger container.
  const cardVariant = {
    hidden: { opacity: 0, y: 32 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: premiumEase },
    },
  };

  // Stars container variant — orchestrates per-star stagger after the card lands.
  // Removed rotate from the item variant: combining rotate+scale was causing
  // visible jank/flicker on iOS Safari (extra GPU layer churn) and the rotation
  // wasn't carrying the design.
  const starsContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
  };
  const starItem = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 360, damping: 18 },
    },
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={onMove}
      variants={cardVariant}
      whileHover={
        isMobile
          ? undefined
          : { y: -8, transition: { type: "spring", stiffness: 300, damping: 22 } }
      }
      className="group relative isolate overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10),0_2px_6px_-2px_rgba(15,23,42,0.04)] transition-shadow duration-500 hover:shadow-[0_28px_60px_-20px_rgba(248,147,93,0.28),0_10px_28px_-12px_rgba(15,23,42,0.10)]"
    >
      {/* Top hairline accent — color baton matching the rest of the page */}
      <div
        aria-hidden
        className="absolute inset-x-6 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#F8935D] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500"
      />

      {/* Cursor-tracked spotlight overlay */}
      {!isMobile && !prefersReducedMotion && (
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 -z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
      )}

      {/* Decorative oversized opening quote — gradient clipped, drifts on hover */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6, delay: 0.25, ease: premiumEase }}
        className="pointer-events-none absolute -top-2 right-4 select-none"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "6rem",
          lineHeight: 1,
          background: "linear-gradient(135deg, rgba(248,147,93,0.35), rgba(247,107,84,0.10))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        &ldquo;
      </motion.div>

      <div className="relative p-7 md:p-8 flex flex-col h-full">
        {/* Stars — staggered pop-in with a spring overshoot.
            Slightly bigger on mobile (20px) to read clearly without zooming;
            the drop-shadow gives the warm glow that anchors the gold tone. */}
        <motion.div
          className="flex items-center gap-1 mb-5"
          variants={starsContainer}
        >
          {[...Array(5)].map((_, i) => (
            <motion.svg
              key={i}
              variants={starItem}
              className="w-5 h-5 md:w-[18px] md:h-[18px] text-amber-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.30)]"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </motion.svg>
          ))}
        </motion.div>

        {/* Quote — larger and more breathable than before */}
        <blockquote className="text-[15.5px] md:text-[16px] leading-[1.7] text-gray-700 mb-7 flex-1">
          {testimonial.quote}
        </blockquote>

        {/* Author block — divider on top, bigger avatar with gradient halo */}
        <div className="pt-5 border-t border-gray-100 flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            {/* Gradient halo — softer at rest, fully lit on hover */}
            <div
              aria-hidden
              className="absolute -inset-[2px] rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] opacity-40 group-hover:opacity-100 transition-opacity duration-400 blur-[2px]"
            />
            <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white bg-white">
              <TestimonialAvatar name={testimonial.name} image={testimonial.image} size={48} />
            </div>
            {/* Verified badge — emerald check, anchors trust */}
            <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center shadow-sm">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3.5}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-[14.5px] truncate">
              {testimonial.name}
            </p>
            <p className="text-gray-500 text-xs truncate">
              {testimonial.role}
              {testimonial.company ? ` · ${testimonial.company}` : ""}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialsSection() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { t } = useLanguage();
  const TESTIMONIALS = getTestimonials(t);

  return (
    <section
      id="testimonials"
      className="relative py-16 md:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Ambient motion layer — orbs + dots + corner-drifting arrows.
          Adds quiet depth behind the testimonial cards without competing. */}
      <AmbientDecorations variant={["orbs", "dots", "arrows"]} intensity={0.85} />

      <div className="max-w-[1184px] mx-auto">
        {/* Title — unified scale with the other premium sections */}
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.5, ease: premiumEase }}
          className="text-center text-[1.75rem] sm:text-[2.25rem] md:text-[2.5rem] lg:text-[2.875rem] font-bold leading-[1.08] tracking-[-0.015em] mb-12 md:mb-16"
        >
          <span className="text-silver-premium">{t.landing.testimonialsTitle1}</span>{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
            {t.landing.testimonialsTitle2}
          </span>
        </motion.h2>

        {/* Cards grid — orchestrated stagger so cards cascade in */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.12, delayChildren: 0.1 },
            },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6"
        >
          {TESTIMONIALS.map((testimonial) => (
            <PremiumTestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              isMobile={isMobile}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// BEFORE/AFTER SECTION - Visual Impact Comparison
// =============================================================================
function BeforeAfterSection() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-silver-shimmer">{t.landing.beforeAfterTitle1}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              {t.landing.beforeAfterTitle2}
            </span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
            {t.landing.beforeAfterSubtitle}
          </p>
        </motion.div>

        {/* Mock-up Comparison — Two browser panels */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 lg:gap-0 items-start">

          {/* ── BEFORE — Mock LinkedIn (gray, empty, frustrating) ── */}
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px 0px 100px 0px" }}
            transition={{ duration: 0.6, ease: premiumEase }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                {t.landing.beforeAfterWithout}
              </span>
            </div>

            {/* Browser window */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-white rounded-md px-3 py-1 text-[11px] text-gray-400 border border-gray-200 w-fit">
                    linkedin.com/feed
                  </div>
                </div>
              </div>

              {/* Compose area — empty & frustrating */}
              <div className="p-5 md:p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 rounded-xl border border-dashed border-gray-200 p-4 min-h-[88px] relative bg-gray-50/50">
                    <span className="text-gray-300 text-sm">{t.landing.beforeAfterThinking}</span>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-gray-300">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[11px] font-mono">2h14</span>
                    </div>
                  </div>
                </div>

                {/* Fake engagement */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.95-.24l-3.296-1.883" /></svg>
                    3
                  </span>
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    0
                  </span>
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    0
                  </span>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-gray-300">0</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterBeforeProspect}</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-gray-300">~2h</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterBeforePerPost}</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-gray-300">1×/mois</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterBeforeFrequency}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── ARROW ── */}
          <div className="hidden lg:flex items-center justify-center self-center px-5">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0, rotate: -90 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "0px 0px 100px 0px" }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center shadow-lg shadow-[#F8935D]/25"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.div>
          </div>
          <div className="flex lg:hidden items-center justify-center py-1">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "0px 0px 100px 0px" }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center shadow-lg shadow-[#F8935D]/25"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </div>

          {/* ── AFTER — Mock Posty dashboard (warm, filled, successful) ── */}
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px 0px 100px 0px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: premiumEase }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-[#F8935D]/10 text-[#F8935D] text-xs font-semibold uppercase tracking-wider">
                {t.landing.beforeAfterWith}
              </span>
            </div>

            {/* Browser window */}
            <div className="rounded-2xl border border-[#F8935D]/20 bg-white shadow-lg shadow-[#F8935D]/[0.07] overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FEF3EE] to-[#FFF8F5] border-b border-[#F8935D]/10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F8935D]/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F8935D]/25" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F8935D]/15" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-white rounded-md px-3 py-1 text-[11px] text-[#F8935D] border border-[#F8935D]/15 w-fit font-medium">
                    postyapp.ai
                  </div>
                </div>
              </div>

              {/* Generated post — ready to publish */}
              <div className="p-5 md:p-6">
                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: "0px 0px 100px 0px" }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.landing.beforeAfterGenerated}
                  </motion.span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F8935D]/10 text-[#F8935D] text-[10px] font-medium">
                    {t.landing.beforeAfterOptimized}
                  </span>
                </div>

                {/* Post preview */}
                <div className="rounded-xl border border-[#F8935D]/15 bg-gradient-to-br from-[#FEF3EE]/30 to-transparent p-4 min-h-[88px]">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    &ldquo;{t.landing.beforeAfterPostPreview}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F8935D]/10">
                    <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-xs font-semibold shadow-sm">
                      {t.landing.beforeAfterPublishNow}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {t.landing.beforeAfterSchedule}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-3 divide-x divide-[#F8935D]/10 border-t border-[#F8935D]/10">
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">12</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterProspects}</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">×3</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterEngagement}</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">1/jour</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t.landing.beforeAfterFrequency}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA — minimal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="text-center mt-14 md:mt-20"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/20 hover:shadow-xl hover:shadow-[#F8935D]/30 transition-all duration-300"
            >
              {t.landing.beforeAfterCTAButton}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// FOUNDER MESSAGE SECTION - Supabase-Inspired Editorial Design (Light)
// With Progressive Scroll-Based Zoom Effect
// =============================================================================
const FOUNDER_LINKEDIN_URL = "https://www.linkedin.com/in/emilien-nepveu-58a38127a/";
const CFO_LINKEDIN_URL = "https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/";

function FounderSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();

  // Scroll-based animation: track section progress via native window scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });

  // Transform scroll progress to scale value (0.88 -> 1.0)
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.6, 1]);

  // Smooth spring animation for more natural feel
  const smoothScale = useSpring(scale, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const smoothOpacity = useSpring(opacity, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section
      ref={sectionRef}
      id="founders"
      className="relative py-14 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Zoom Container - applies scale effect */}
      <motion.div
        style={{
          scale: prefersReducedMotion ? 1 : smoothScale,
          opacity: prefersReducedMotion ? 1 : smoothOpacity,
          willChange: "transform, opacity",
        }}
        className="relative max-w-4xl 2xl:max-w-5xl mx-auto origin-center"
      >
        {/* Decorative glow behind content */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-[#F8935D]/5 via-[#F76B54]/8 to-[#F8935D]/5 rounded-full blur-[100px]" />
        </div>

        {/* Main Quote - Hero Typography */}
        <motion.blockquote
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="flex justify-center mb-6">
            <svg className="w-10 h-10 md:w-12 md:h-12 text-[#F8935D]/20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-[2.5rem] 2xl:text-[2.75rem] font-medium text-gray-900 leading-snug md:leading-tight tracking-tight">
            {t.landing.foundersQuote.split("Posty").map((part: string, i: number, arr: string[]) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                    Posty
                  </span>
                )}
              </span>
            ))}
          </p>
        </motion.blockquote>

        {/* Co-founders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: smoothEase, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          {/* Photos row */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mb-4">
            <Link
              href={FOUNDER_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2"
              aria-label={t.landing.foundersEmilienAlt}
            >
              <div className="relative w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 aspect-square rounded-full overflow-hidden ring-4 ring-white shadow-xl shadow-gray-200/50">
                <Image src="/images/team/ceo.jpg" alt={t.landing.foundersEmilien} fill className="object-cover object-center" sizes="80px" />
              </div>
            </Link>
            <Link
              href={CFO_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2"
              aria-label={t.landing.foundersComeAlt}
            >
              <div className="relative w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 aspect-square rounded-full overflow-hidden ring-4 ring-white shadow-xl shadow-gray-200/50">
                <Image src="/images/team/cmo.jpg" alt={t.landing.foundersCome} fill className="object-cover object-center" sizes="80px" />
              </div>
            </Link>
          </div>

          {/* Shared role badge — juste sous les photos */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-10 sm:w-14 bg-gradient-to-r from-transparent to-[#F8935D]/30" />
            <span className="text-gray-500 text-[11px] md:text-xs font-medium tracking-[0.14em] uppercase select-none">
              {t.landing.foundersRole}
            </span>
            <div className="h-px w-10 sm:w-14 bg-gradient-to-l from-transparent to-[#F8935D]/30" />
          </div>

          {/* Names + roles row */}
          <div className="flex items-start justify-center gap-8 sm:gap-12">
            {/* Emilien */}
            <div className="flex flex-col items-center text-center">
              <Link
                href={FOUNDER_LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2 rounded"
              >
                <span className="text-gray-900 font-semibold text-sm md:text-base relative inline-block">
                  {t.landing.foundersEmilien}
                  <span className="absolute left-0 -bottom-0.5 w-full h-[2px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] origin-left scale-x-0 md:group-hover:scale-x-100 transition-transform duration-300 ease-out rounded-full" />
                </span>
              </Link>
              <p className="text-gray-400 text-[11px] md:text-xs tracking-wide mt-0.5">{t.landing.foundersEmilienRole}</p>
            </div>

            {/* Côme */}
            <div className="flex flex-col items-center text-center">
              <Link
                href={CFO_LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2 rounded"
              >
                <span className="text-gray-900 font-semibold text-sm md:text-base relative inline-block">
                  {t.landing.foundersCome}
                  <span className="absolute left-0 -bottom-0.5 w-full h-[2px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] origin-left scale-x-0 md:group-hover:scale-x-100 transition-transform duration-300 ease-out rounded-full" />
                </span>
              </Link>
              <p className="text-gray-400 text-[11px] md:text-xs tracking-wide mt-0.5">{t.landing.foundersComeRole}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// =============================================================================
// PRICING SECTION - Uses shared PricingCard component
// =============================================================================
const PLANS = getAllPlans();

function PricingSection() {
  const { t } = useLanguage();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <section id="pricing" className="py-16 md:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-12 overflow-x-clip">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.6, ease: premiumEase }}
          className="text-center mb-10 sm:mb-12 md:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
            <span className="text-gray-900">{t.landing.pricingHeadline1}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] bg-[length:200%_100%] animate-[gradient-x_3s_ease_infinite]">
              {t.landing.pricingHeadline2}
            </span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10">
            {t.landing.pricingDescription}
          </p>

          <BillingToggle
            isYearly={billingPeriod === "yearly"}
            onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
            monthlyLabel={t.settings.billingMonthly}
            yearlyLabel={t.settings.billingYearly}
            savingsLabel={t.landing.pricingSavingsLabel}
            showSavings={true}
          />
        </motion.div>

        {/* Cards grid — conversion-first landing cards (Pro = filled hero).
            items-stretch so the three share one clean height; the hero lifts
            itself via its own negative margin. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 lg:gap-7 max-w-5xl mx-auto items-stretch overflow-visible px-1 py-4">
          {PLANS.map((plan, index) => (
            <LandingPricingCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriod}
              index={index}
              previousPlanName={index > 0 ? PLANS[index - 1].name : undefined}
              ctaHref="/signup"
            />
          ))}
        </div>

        {/* Business offer — B2B funnel, expandable details on click */}
        <BusinessOffer />
      </div>
    </section>
  );
}

// =============================================================================
// CTA BANNER - Premium Final Conversion Section
// =============================================================================
function CtaBanner({
  headline,
  subtext,
  ctaLabel,
  id,
}: {
  headline: string;
  subtext: string;
  ctaLabel: string;
  id?: string;
}) {
  const { t } = useLanguage();
  return (
    <section id={id} className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.35 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight"
        >
          {headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-gray-500 text-base md:text-lg mb-8"
        >
          {subtext}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="inline-block"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          >
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2.5 h-12 md:h-14 px-7 md:px-9 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm md:text-base font-semibold rounded-xl shadow-lg shadow-[#F8935D]/15 hover:shadow-xl hover:shadow-[#F8935D]/25 transition-shadow duration-300 overflow-hidden"
            >
              {/* Shine sweep on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out pointer-events-none" />
              <span className="relative">{ctaLabel}</span>
              <svg className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-5 text-xs text-gray-400"
        >
          {t.landing.pricingTrialIncluded}
        </motion.p>
      </div>
    </section>
  );
}

// =============================================================================
// FAQ SECTION - Accordion-Style Questions & Answers
// =============================================================================
function getFaqItems(t: ReturnType<typeof useLanguage>["t"]) {
  return [
    { question: t.landing.faqQ1, answer: t.landing.faqA1 },
    { question: t.landing.faqQ2, answer: t.landing.faqA2 },
    { question: t.landing.faqQ3, answer: t.landing.faqA3 },
    { question: t.landing.faqQ4, answer: t.landing.faqA4 },
    { question: t.landing.faqQ5, answer: t.landing.faqA5 },
    { question: t.landing.faqQ6, answer: t.landing.faqA6 },
    { question: t.landing.faqQ7, answer: t.landing.faqA7 },
    { question: t.landing.faqQ8, answer: t.landing.faqA8 },
  ];
}

function FaqItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: { question: string; answer: string };
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 100px 0px" }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: smoothEase }}
      className="border-b border-gray-200 last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="relative w-full flex items-center justify-between py-6 text-left group rounded-xl px-2 -mx-2 hover:bg-[#F8935D]/[0.04] transition-colors duration-300"
        aria-expanded={isOpen}
      >
        <span
          className={`text-lg font-semibold pr-4 transition-colors duration-200 ${
            isOpen ? "text-[#F8935D]" : "text-gray-900 group-hover:text-[#F8935D]"
          }`}
        >
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
            isOpen
              ? "bg-[#F8935D]/10 text-[#F8935D]"
              : "bg-gray-100 text-gray-400 group-hover:bg-[#F8935D]/10 group-hover:text-[#F8935D]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-600 leading-relaxed max-w-3xl">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FaqSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const faqItems = getFaqItems(t);

  return (
    <section id="faq" className="relative py-16 md:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-12 overflow-hidden">
      {/* Subtle ambient layer — single drawn wave + low-intensity dots */}
      <AmbientDecorations variant={["dots", "waves"]} intensity={0.55} />
      <div className="relative z-[1] max-w-3xl 2xl:max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px 100px 0px" }}
          transition={{ duration: 0.4, ease: premiumEase }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
            {t.landing.faqTitle1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              {t.landing.faqTitle2}
            </span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100/60 px-8">
          {faqItems.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FOOTER
// =============================================================================
function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[#F0D5C8]/40 py-8 md:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px 100px 0px" }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="max-w-7xl 2xl:max-w-[1400px] mx-auto"
      >

        {/* ─── MOBILE FOOTER (compact with all desktop content) ─── */}
        <div className="md:hidden">
          {/* Logo + Tagline + Socials */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <Link href="/" className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm shadow-[#F8935D]/10">
                  <Image src="/og-image.jpg" alt="Posty" width={28} height={28} className="w-full h-full object-cover" />
                </div>
                <span translate="no" className="notranslate text-sm font-bold text-gray-900">Posty</span>
              </Link>
              <p className="text-[10px] text-gray-500 leading-tight max-w-[200px]">
                {t.footer.tagline}
              </p>
              <p className="text-[10px] text-[#F8935D] font-medium mt-1">
                {t.footer.taglineAccent}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href="https://www.linkedin.com/company/posty" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-colors" aria-label="LinkedIn">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
            </div>
          </div>

          {/* Links — 3 columns: Navigation | Legal | Account */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-4 text-[11px]">
            {/* Navigation */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">{t.footer.navigation}</p>
              <button onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.features}</button>
              <button onClick={() => document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.testimonials}</button>
              <button onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.pricing}</button>
              <button onClick={() => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.faq}</button>
            </div>
            {/* Legal */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">{t.footer.legal}</p>
              <Link href="/legal/privacy" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.privacy}</Link>
              <Link href="/legal/terms" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.terms}</Link>
              <Link href="/legal/notices" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.legalNotices}</Link>
              <Link href="/legal/cookies" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.cookies}</Link>
            </div>
            {/* Account */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">{t.footer.account}</p>
              <Link href="/login" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.login}</Link>
              <Link href="/signup" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.signup}</Link>
              <Link href="/about" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">{t.footer.about}</Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-3 border-t border-[#F0D5C8]/60 flex items-center justify-between">
            <p className="text-gray-400 text-[10px]">{t.footer.copyright.replace("{year}", String(year))}</p>
            <p className="text-gray-400 text-[10px]">{t.footer.madeInShort}</p>
          </div>
          {/* Brand-entity triple line — sitewide signal for Google to fuse
              "Posty" + "Posty AI" + "postyapp.ai" into one entity. */}
          <p
            translate="no"
            className="notranslate mt-2 text-center text-gray-400 text-[10px] tracking-wide"
          >
            © {year} <span className="font-semibold text-gray-500">Posty</span> — Posty AI · postyapp.ai
          </p>
        </div>

        {/* ─── DESKTOP FOOTER (full) ─── */}
        <div className="hidden md:block">
          <div className="grid grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#F8935D]/10">
                  <Image src="/og-image.jpg" alt="Posty" width={40} height={40} className="w-full h-full object-cover" />
                </div>
                <span translate="no" className="notranslate text-xl font-bold text-gray-900">Posty</span>
              </Link>
              <p className="text-gray-500 max-w-sm">
                {t.footer.description}
              </p>
              <p className="text-[#F8935D] font-medium text-sm mt-3">
                {t.footer.descriptionAccent}
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a href="https://www.linkedin.com/company/posty" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-all duration-200" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">{t.footer.navigation}</h4>
              <ul className="space-y-3">
                <li><button onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.features}</button></li>
                <li><button onClick={() => document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.testimonials}</button></li>
                <li><button onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.pricing}</button></li>
                <li><button onClick={() => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.faq}</button></li>
                <li><Link href="/about" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.about}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">{t.footer.legal}</h4>
              <ul className="space-y-3">
                <li><Link href="/legal/privacy" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.privacyPolicy}</Link></li>
                <li><Link href="/legal/terms" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.termsOfUse}</Link></li>
                <li><Link href="/legal/notices" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.legalNotices}</Link></li>
                <li><Link href="/legal/cookies" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.cookiePolicy}</Link></li>
                <li><a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#F8935D] transition-colors">{t.footer.cnil}</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-[#F0D5C8]/60 flex flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">{t.footer.copyright.replace("{year}", String(year))}</p>
            <p className="text-gray-500 text-sm">{t.footer.madeIn}</p>
          </div>
          {/* Brand-entity triple line — sitewide signal for Google to fuse
              "Posty" + "Posty AI" + "postyapp.ai" into one entity. */}
          <p
            translate="no"
            className="notranslate mt-3 text-center text-gray-400 text-xs tracking-wide"
          >
            © {year} <span className="font-semibold text-gray-600">Posty</span> — Posty AI · postyapp.ai
          </p>
        </div>

      </motion.div>
    </footer>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================
export default function LandingPage() {
  const { user, userProfile, loading } = useAuth();
  const { language: currentLang } = useLanguage();
  const router = useRouter();

  // Force light mode on landing page
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");

    // Remove classes that might block scroll on body (from PWA, modals, other pages)
    const blockingClasses = [
      "pwa-mobile", "no-scroll", "sidebar-open", "landing-no-scroll",
      "scroll-locked", "modal-open", "bottomsheet-open", "no-bounce",
      "page-fixed",
    ];
    blockingClasses.forEach((cls) => {
      document.body.classList.remove(cls);
      root.classList.remove(cls);
    });

    document.body.classList.add("landing-scroll-enabled");
    root.classList.add("landing-scroll-enabled");

    return () => {
      document.body.classList.remove("landing-scroll-enabled");
      root.classList.remove("landing-scroll-enabled");
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push(userProfile?.onboardingComplete ? "/app" : "/onboarding");
    }
  }, [loading, user, userProfile, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-[#FEF3EE] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F8935D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    // Root wrapper stays neutral. The unified <LandingSceneEngine /> below
    // paints the entire site-wide background: a single fixed layer with five
    // signature ambients that crossfade as the viewport center moves between
    // sections tagged with `data-scene`, plus a global silver-star canvas that
    // travels across every scene (previously bounded to FAQ + Hero only).
    <div className="relative">
      {/* Site-wide FAQPage JSON-LD — scoped to the homepage only to avoid
          duplicating the schema on (seo) group pages that ship their own. */}
      <FaqJsonLd questions={postyFaqData.en} />
      {/* Unified background: gradients + stars + dot grid, scroll-driven. */}
      <LandingSceneEngine />
      <Navbar />
      <div key={currentLang} className="text-gray-900 relative">
        {/* Hero — welcome ambient (orange/coral). Opens the chromatic
            narrative, same palette as /app. */}
        <div data-scene="welcome" className="relative z-[5]">
          <DemoSection />
        </div>

        {/* CREATION + IDENTITY chapter — visuals ambient (fuchsia + rose).
            Same palette as /historique. Groups the feature/value showcase
            and the audience marquee under one cohesive archive-y wash. */}
        <div data-scene="visuals" className="relative z-[5]">
          <FeaturesSection />
          <ValueBlock />
          <TargetAudienceSection />
        </div>

        {/* PROOF + PLANNING chapter — schedule ambient (sky + violet).
            Same palette as /programme. Wraps the copilot beat together with
            the social-proof and conversion blocks under one cooler-air
            wash that signals "method / how it works / what it returns". */}
        <div data-scene="schedule" className="relative z-[5]">
          <CopilotSectionWrapper />
          <TestimonialsSection />
          <FounderSection />
          {/* ROI simulator — value-before-price anchor */}
          <ROISimulator />
          <PricingSection />
        </div>

        {/* FAQ — loops back to welcome for narrative closure. The local
            <AuroraBackground /> instance was removed: the global engine now
            paints the warm gradient + silver stars, identical to the hero. */}
        <div data-scene="welcome" className="relative z-[5] overflow-hidden">
          <FaqSection />
        </div>

        {/* Footer — slim white wash (no warm tint) so legal copy stays crisp
            against the soft ambient halos. */}
        <div className="relative z-[5] bg-white/60 backdrop-blur-[2px]">
          <Footer />
        </div>
      </div>
    </div>
  );
}
