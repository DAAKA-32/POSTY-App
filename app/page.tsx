"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion, useInView, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getAllPlans, getPaidPlans, PlanConfig, GUARANTEE_PERIOD_DAYS } from "@/lib/plans";
import BillingToggle from "@/components/ui/BillingToggle";
import PricingCard from "@/components/pricing/PricingCard";
import PricingTrustBadges from "@/components/pricing/PricingTrustBadges";
import { useScrollLock } from "@/hooks/useScrollLock";
import AnimatedMacBook from "@/components/landing/AnimatedMacBook";
import AuroraBackground from "@/components/landing/AuroraBackground";

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

// Mobile nav link data with icons
const NAV_LINKS = [
  {
    label: "Demo",
    href: "#demo",
    description: "Voir Posty en action",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: "Fonctionnalités",
    href: "#features",
    description: "Ce que Posty fait pour vous",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "Témoignages",
    href: "#testimonials",
    description: "Ce qu'en disent nos clients",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: "Tarifs",
    href: "#pricing",
    description: "Plans et tarification",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
];

// Staggered animation variants for menu items
const mobileMenuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

const mobileItemVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: { duration: 0.2 },
  },
};

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // sync on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section detection via IntersectionObserver
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.replace("#", ""));
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

  // Smooth scroll with proper navbar offset handling
  const scrollTo = useCallback((href: string) => {
    setIsMenuOpen(false);

    const scrollToSection = () => {
      const targetElement = document.querySelector(href) as HTMLElement;
      if (!targetElement) return;

      // Calculate navbar height dynamically (accounts for scrolled/non-scrolled state)
      // Desktop: 68px + 12px padding when scrolled = 80px, Mobile: 64px + 12px = 76px
      const isMobile = window.innerWidth < 768;
      const navbarOffset = isMobile ? 76 : 84;

      // Get target position and apply offset
      const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = targetPosition - navbarOffset;

      // Smooth scroll with native behavior for best performance
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
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
    {/* Outer fixed container — always full width for positioning */}
    <div className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-colors duration-700 ${isScrolled && !isMenuOpen ? "bg-[#FEF3EE]" : ""}`}>
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
              ? "bg-white backdrop-blur-xl shadow-md shadow-gray-900/[0.05] border border-gray-200/50"
              : "bg-transparent border border-transparent"
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
                <span className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Posty</span>
              </Link>

              {/* Desktop Nav — pill bg on hover + active indicator */}
              <div className={`
                hidden md:flex items-center gap-0.5 p-1 rounded-2xl transition-all duration-400
                ${isScrolled ? "bg-gray-100/70" : "bg-transparent"}
              `}>
                {NAV_LINKS.map((link) => {
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
                <Link
                  href="/login"
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  Se connecter
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-[13px] font-semibold rounded-xl shadow-md shadow-[#F8935D]/20 hover:shadow-lg hover:shadow-[#F8935D]/25 transition-shadow duration-200"
                  >
                    Essai gratuit
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
                aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
                <span className="text-lg font-bold text-gray-900 tracking-tight">Posty</span>
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Fermer le menu"
              >
                <HamburgerIcon isOpen={true} />
              </button>
            </div>

            {/* Navigation items - at the top, not centered */}
            <nav className="px-4 sm:px-6 pt-4" role="navigation">
              <motion.div
                variants={mobileMenuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-2"
              >
                {NAV_LINKS.map((link) => {
                  const isActive = activeSection === link.href;
                  return (
                    <motion.button
                      key={link.href}
                      variants={mobileItemVariants}
                      onClick={() => scrollTo(link.href)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                        transition-colors duration-200 group
                        ${isActive
                          ? "bg-white shadow-md shadow-[#F8935D]/10 border border-[#F8935D]/20"
                          : "bg-white/50 border border-transparent hover:bg-white hover:shadow-sm active:bg-white"
                        }
                      `}
                    >
                      {/* Icon */}
                      <div className={`
                        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200
                        ${isActive
                          ? "bg-gradient-to-br from-[#F8935D] to-[#F76B54] text-white shadow-sm"
                          : "bg-[#FEF3EE] text-[#F8935D]/70 group-hover:text-[#F8935D]"
                        }
                      `}>
                        {link.icon}
                      </div>
                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold ${isActive ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"}`}>
                          {link.label}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{link.description}</p>
                      </div>
                      {/* Arrow */}
                      <svg className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${isActive ? "text-[#F8935D]" : "text-gray-300 group-hover:text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4" />

              <div className="space-y-2.5">
                {/* Primary CTA */}
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl font-bold text-white text-[15px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-lg shadow-[#F8935D]/25 active:scale-[0.98] transition-transform duration-150"
                >
                  Commencer gratuitement
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                {/* Secondary — Login */}
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl font-medium text-sm text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 active:scale-[0.98] transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Se connecter
                </Link>
              </div>

              {/* Trust indicators - compact */}
              <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Essai gratuit 7 jours
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>Annulation à tout moment</span>
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
      className="background-landing relative min-h-[100dvh] lg:min-h-screen flex items-center overflow-hidden"
    >
      {/* === AURORA STAR PARTICLES (hero only) === */}
      <AuroraBackground />

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
      <div className="relative z-10 w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-20 md:py-24 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20 2xl:gap-28 items-center">

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
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-gray-200/30 mb-6 lg:mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-gray-700">
                Choisi par des <span className="font-bold text-gray-900">entrepreneurs qui signent des clients sur LinkedIn</span>
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

            {/* Main headline */}
            <h1 className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] 2xl:text-[4.25rem] font-semibold leading-[1.1] tracking-[-0.02em]">
              <span className="block text-silver-premium">Vos posts LinkedIn</span>
              <span className="block mt-1 lg:mt-2 text-silver-premium">
                signent des{" "}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] bg-[length:200%_100%] animate-[gradient-x_3s_ease_infinite]">
                    clients
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
                Pas juste des likes.
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 lg:mt-6 text-lg lg:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Décrivez votre objectif. Posty génère un post LinkedIn{" "}
              <span className="font-semibold text-gray-800">prêt à publier</span>,
              calibré pour{" "}
              <span className="font-semibold text-gray-800">votre audience et votre marché</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/signup"
                  className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-base font-semibold rounded-2xl shadow-xl shadow-[#F8935D]/30 hover:shadow-2xl hover:shadow-[#F8935D]/40 transition-all duration-300 overflow-hidden"
                >
                  {/* Shine effect on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative">Commencer gratuitement</span>
                  <svg className="relative w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
              <motion.a
                href="#demo"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200/80 text-gray-700 text-base font-semibold rounded-2xl hover:border-[#F8935D]/40 hover:bg-white hover:text-gray-900 hover:shadow-lg transition-all duration-300"
              >
                <svg className="w-5 h-5 text-[#F8935D]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Voir Posty en action
              </motion.a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 lg:mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-gray-500"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Essai gratuit 7 jours
              </span>
              <span className="flex items-center gap-2 font-medium text-[#F8935D]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Satisfait ou remboursé 7j
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Prêt en 2 minutes
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Premier post en 30 sec
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
            <div className="relative flex items-end justify-center lg:justify-end gap-4 md:gap-6 py-8 lg:py-0">
              {/* iPhone — floating left */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-20 w-[90px] sm:w-[110px] md:w-[140px] lg:w-[160px] xl:w-[180px] flex-shrink-0"
              >
                {/* Floating animation */}
                <motion.div
                  animate={(prefersReducedMotion || isMobile) ? {} : {
                    y: [0, -8, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Image
                    src="/iphoneimg.png"
                    alt="Posty sur iPhone"
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
                className="relative z-10 w-[220px] sm:w-[280px] md:w-[380px] lg:w-[420px] xl:w-[500px]"
              >
                {/* Subtle floating animation */}
                <motion.div
                  animate={(prefersReducedMotion || isMobile) ? {} : {
                    y: [0, -6, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <Image
                    src="/macimg.png"
                    alt="Posty sur MacBook"
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

            {/* Floating stats card — desktop only */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute -left-4 xl:-left-8 top-1/4 z-30"
            >
              <motion.div
                animate={(prefersReducedMotion || isMobile) ? {} : {
                  y: [0, -5, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Engagement moyen</p>
                    <p className="text-lg font-bold text-gray-900">x3</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Floating notification — desktop only */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute -right-2 xl:right-4 bottom-1/4 z-30"
            >
              <motion.div
                animate={(prefersReducedMotion || isMobile) ? {} : {
                  y: [0, 5, 0],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nouveau client</p>
                    <p className="text-sm font-semibold text-gray-900">via LinkedIn</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
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

const ALL_DEMO_SUGGESTIONS = [
  { label: "Signer un client B2B", emoji: "🎯", text: "Je suis consultant et je veux attirer des décideurs B2B qui ont besoin de mon expertise" },
  { label: "Prouver mon expertise", emoji: "👤", text: "Je veux que mes prospects me voient comme la référence de mon secteur" },
  { label: "Transformer mes vues en RDV", emoji: "💼", text: "Mes posts LinkedIn ont des vues mais ne génèrent aucun RDV client" },
  { label: "Lancer mon offre", emoji: "📈", text: "Je lance une nouvelle offre et je veux que mon réseau LinkedIn en parle" },
  { label: "Partager un cas client", emoji: "🤝", text: "J'ai aidé un client à doubler son CA et je veux le raconter pour attirer des prospects similaires" },
  { label: "Raconter mon parcours", emoji: "✍️", text: "Je veux partager une leçon business tirée de mon expérience pour engager mon audience" },
  { label: "Booster ma visibilité", emoji: "🚀", text: "Je publie rarement sur LinkedIn et je veux enfin être visible auprès de mes prospects" },
];

// Module-level flag to track if hero animation played (persists across re-renders, resets on page refresh)
let heroAnimationPlayedGlobal = false;

function DemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const fullScreenChatRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();
  const [titleHeight, setTitleHeight] = useState(0);

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
  const HERO_WORDS_L1 = ["Vos", "posts", "LinkedIn"];
  const HERO_WORDS_L2 = ["signent", "vos", "clients"];
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
  const { scrollY } = useScroll();
  const titleOpacity = useTransform(scrollY, [0, Math.max(titleHeight * 0.7, 150)], [1, 0]);

  // View mode state
  const [viewMode, setViewMode] = useState<"demo" | "preview">("preview");

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
  const [suggestions] = useState(() => {
    const shuffled = [...ALL_DEMO_SUGGESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

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
        throw new Error(errData.message || "Erreur lors de la génération");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream non disponible");

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
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
        className="relative z-[2]"
      >
        {/* Hero title — fixed: stays on screen while content scrolls over it */}
        <motion.div ref={titleRef} style={{ opacity: titleOpacity }} className="fixed top-0 left-0 right-0 z-[1] pt-24 md:pt-32 pb-10 md:pb-14 px-4 sm:px-6 lg:px-8">
          <div className="relative text-center max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] 2xl:text-[4rem] font-bold tracking-tight flex flex-col items-center gap-0 [&>span]:-my-[0.2em]">
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
                    {word}{i < HERO_WORDS_L1.length - 1 ? "\u00A0" : ""}
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
                      {word}{i < HERO_WORDS_L2.length - 1 ? "\u00A0" : ""}
                    </span>
                  );
                })}
              </span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 16, filter: "blur(3px)" }}
              animate={hasAnimated ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 16, filter: "blur(3px)" }}
              transition={{
                duration: 0.6,
                delay: hasAnimated ? 0.25 : 0,
                ease: cinematicEase,
              }}
              className="mt-8 md:mt-10 text-gray-500 text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              Décrivez votre objectif. Posty génère un post LinkedIn prêt à publier en 30 secondes.
            </motion.p>
          </div>
        </motion.div>

        {/* Spacer: compensates for the fixed title removed from document flow */}
        <div style={{ height: titleHeight }} />

        {/* Content — cinematic reveal: starts high + clipped, descends into place */}
        {/* z-[3] scrolls over the fixed title — transparent so aurora shows through */}
        <motion.div
          className="relative z-[3] overflow-x-hidden"
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
                  Aperçu produit
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
                  Essayer la demo
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
                    <p className="text-gray-900 font-semibold text-sm md:text-base">Posty</p>
                    <p className="text-[11px] md:text-xs text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Prêt à générer
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
                    <p className="text-gray-900 font-semibold text-base mb-1">Votre premier post LinkedIn est prêt</p>
                    <p className="text-gray-500 text-sm mb-5 max-w-xs">
                      Créez votre compte pour le publier et en générer un chaque jour.
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
                          Voir mon post
                        </button>
                      )}
                      <Link
                        href="/signup"
                        className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                      >
                        Publier mon premier post — 7 jours gratuits
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
                          Quel client voulez-vous attirer ?
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
                          placeholder="Ex : Je veux attirer des dirigeants SaaS vers mon offre de consulting..."
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
                initial={alreadyPlayed ? undefined : { clipPath: "inset(50% 0 50% 0)" }}
                animate={
                  heroPhase === "init"
                    ? { clipPath: "inset(50% 0 50% 0)" }
                    : { clipPath: "inset(0% 0 0% 0)" }
                }
                transition={{ duration: 1, ease: cinematicEase }}
              >
                <AnimatedMacBook
                  isVisible={viewMode === "preview"}
                  onAnimationComplete={handleMacBookAnimationComplete}
                />
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
                  <p className="text-gray-900 font-semibold text-sm">Posty</p>
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {isStreaming ? "Écrit..." : "IA disponible"}
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
                              Copie !
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copier le post
                            </>
                          )}
                        </button>

                        <div className="px-5 py-4 bg-gradient-to-r from-[#F8935D]/5 to-[#F76B54]/5 border border-[#F8935D]/15 rounded-xl">
                          <p className="text-gray-600 text-sm mb-3">
                            Ce post peut vous amener votre prochain prospect demain matin.
                          </p>
                          <Link
                            href="/signup"
                            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                          >
                            Publier mon premier post — 7 jours gratuits
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

  // Premium stagger animation for grid items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section id="benefices" className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
      {/* Subtle background - premium warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FFFBF8] to-white" />

      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Editorial style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-16 md:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-semibold leading-[1.15] tracking-tight mb-5">
            <span className="text-silver-shimmer">Ce qui change après</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#E8824C]">
              30 jours avec Posty
            </span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Pas de promesses magiques. Juste ce que nos utilisateurs
            constatent après quelques semaines de publication régulière.
          </p>
        </motion.div>

        {/* Bento Grid Layout - Asymmetric premium design */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
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
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F8935D]/10 to-[#F76B54]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Productivité</span>
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 leading-snug">
                  5 heures récupérées chaque semaine
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6 max-w-xl">
                  Vos posts sont prêts en quelques clics, dans votre ton, sur vos sujets.
                  Le dimanche soir redevient le vôtre.
                </p>

                {/* Metric highlight */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-gray-900">5h</span>
                  <span className="text-gray-500">économisées par semaine en moyenne</span>
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
                  Votre audience grandit naturellement
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  Quand vous publiez régulièrement, LinkedIn vous met en avant.
                  Vos posts touchent plus de monde, sans forcer.
                </p>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-gray-900">x3</span>
                  <span className="text-sm text-gray-500">vues en moyenne</span>
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
                  Les opportunités viennent à vous
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  Clients, partenaires, recruteurs... Ils vous contactent
                  parce qu'ils voient votre expertise au quotidien.
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-white" />
                  </div>
                  <span className="text-sm text-gray-500">nouveaux contacts chaque semaine</span>
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
                  &ldquo;Avant, je passais mes dimanches à préparer mes posts LinkedIn.
                  Maintenant, c'est fait en 10 minutes le lundi matin. Et mes résultats
                  n'ont jamais été aussi bons.&rdquo;
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center text-white font-semibold text-lg">
                    M
                  </div>
                  <div>
                    <p className="text-white font-medium">Marie Dubois</p>
                    <p className="text-white/60 text-sm">Consultante en stratégie</p>
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
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: premiumEase }}
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
// TARGET AUDIENCE SECTION — Premium Interactive Light Showcase
// =============================================================================
const audienceAccents = {
  cyan: {
    gradient: "from-cyan-400 to-blue-500",
    iconBg: "bg-gradient-to-br from-cyan-100 to-blue-100",
    iconRing: "ring-cyan-200/60",
    iconColor: "text-cyan-600",
    tag: "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200/60",
    solutionDot: "bg-cyan-500",
    solutionLabel: "text-cyan-600/80",
    glowRgb: "6, 182, 212",
    numberColor: "text-cyan-400/[0.08]",
    accentBar: "from-cyan-400 to-blue-500",
  },
  violet: {
    gradient: "from-violet-400 to-purple-500",
    iconBg: "bg-gradient-to-br from-violet-100 to-purple-100",
    iconRing: "ring-violet-200/60",
    iconColor: "text-violet-600",
    tag: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200/60",
    solutionDot: "bg-violet-500",
    solutionLabel: "text-violet-600/80",
    glowRgb: "139, 92, 246",
    numberColor: "text-violet-400/[0.08]",
    accentBar: "from-violet-400 to-purple-500",
  },
  amber: {
    gradient: "from-amber-400 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-100",
    iconRing: "ring-amber-200/60",
    iconColor: "text-amber-600",
    tag: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
    solutionDot: "bg-amber-500",
    solutionLabel: "text-amber-600/80",
    glowRgb: "245, 158, 11",
    numberColor: "text-amber-400/[0.08]",
    accentBar: "from-amber-400 to-orange-500",
  },
} as const;

const AUDIENCE_PROFILES = [
  {
    title: "Entrepreneurs & Fondateurs",
    subtitle: "CEOs \u00b7 Solopreneurs \u00b7 Fondateurs",
    painPoint: "Pas le temps de publier. Pas d\u2019angle. LinkedIn reste un potentiel inexploit\u00e9.",
    solution: "Un post strat\u00e9gique en 30 secondes. Votre LinkedIn g\u00e9n\u00e8re des leads pendant que vous d\u00e9veloppez votre business.",
    metrics: [
      { value: "30s", label: "Par post" },
      { value: "1/jour", label: "Fr\u00e9quence" },
    ],
    tag: "Id\u00e9al pour les CEOs et solopreneurs",
    accent: "cyan" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    title: "Agences & Directeurs Marketing",
    subtitle: "CMOs \u00b7 Agences \u00b7 \u00c9quipes marketing",
    painPoint: "Multi-clients = temps fou et qualit\u00e9 in\u00e9gale. Impossible de scaler manuellement.",
    solution: "Contenu premium \u00e0 grande \u00e9chelle, ton coh\u00e9rent par client. Scalez votre offre sans recruter.",
    metrics: [
      { value: "10+", label: "Clients g\u00e9r\u00e9s" },
      { value: "100%", label: "Ton coh\u00e9rent" },
    ],
    tag: "Id\u00e9al pour les agences et CMOs",
    accent: "violet" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Freelances & Consultants",
    subtitle: "Ind\u00e9pendants \u00b7 Experts \u00b7 Consultants B2B",
    painPoint: "Z\u00e9ro temps pour le marketing. Sans visibilit\u00e9 LinkedIn, le prochain contrat reste incertain.",
    solution: "Dictez une id\u00e9e entre deux RDV. Posty cr\u00e9e le post qui attire vos prochains clients.",
    metrics: [
      { value: "2 min", label: "Entre 2 RDV" },
      { value: "\u00d73", label: "Visibilit\u00e9" },
    ],
    tag: "Id\u00e9al pour les ind\u00e9pendants B2B",
    accent: "amber" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

function AudienceCard({ profile, index }: { profile: typeof AUDIENCE_PROFILES[number]; index: number }) {
  const accent = audienceAccents[profile.accent];
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D perspective tilt — desktop only
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rawRotateX = useTransform(mouseY, [0, 1], [5, -5]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-5, 5]);
  const rotateX = useSpring(rawRotateX, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 150, damping: 20 });

  // Cursor-tracking spotlight
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);
  const spotlightBg = useMotionTemplate`radial-gradient(350px circle at ${spotlightX}% ${spotlightY}%, rgba(${accent.glowRgb}, 0.08), transparent 60%)`;

  const enableHover = !isMobile && !prefersReducedMotion;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableHover) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseX.set(nx);
    mouseY.set(ny);
    spotlightX.set(nx * 100);
    spotlightY.set(ny * 100);
  }, [mouseX, mouseY, spotlightX, spotlightY, enableHover]);

  const handleMouseLeave = useCallback(() => {
    if (!enableHover) return;
    mouseX.set(0.5);
    mouseY.set(0.5);
    spotlightX.set(50);
    spotlightY.set(50);
  }, [mouseX, mouseY, spotlightX, spotlightY, enableHover]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, ...((prefersReducedMotion || isMobile) ? {} : { filter: "blur(10px)" }) }}
      whileInView={{ opacity: 1, y: 0, ...((prefersReducedMotion || isMobile) ? {} : { filter: "blur(0px)" }) }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.15, duration: 0.7, ease: smoothEase }}
      onMouseMove={enableHover ? handleMouseMove : undefined}
      onMouseLeave={enableHover ? handleMouseLeave : undefined}
      className={`${enableHover ? "group" : ""} relative h-full`}
      style={enableHover ? { perspective: 1000 } : undefined}
    >
      <motion.div
        style={enableHover ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="relative h-full"
      >
        {/* Ambient hover glow */}
        <div
          className="absolute -inset-6 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(400px circle at 50% 30%, rgba(${accent.glowRgb}, 0.15), transparent 70%)` }}
        />

        {/* Card shell */}
        <div className="relative h-full rounded-2xl overflow-hidden shadow-sm group-hover:shadow-xl transition-shadow duration-500">
          {/* Gradient border shimmer */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${accent.gradient} ${enableHover ? "opacity-[0.12] group-hover:opacity-[0.25]" : "opacity-[0.18]"} transition-opacity duration-500`} />

          {/* Cursor spotlight */}
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: spotlightBg }}
          />

          {/* Inner card */}
          <div className="relative h-full m-[1px] rounded-[15px] bg-white overflow-hidden">
            {/* Left accent bar + traveling glow */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${accent.accentBar} ${enableHover ? "opacity-40 group-hover:opacity-90" : "opacity-70"} transition-opacity duration-500`}>
              <motion.div
                className="absolute inset-x-0 h-10 blur-sm"
                style={{ background: `linear-gradient(to bottom, transparent, rgba(${accent.glowRgb}, 0.6), transparent)` }}
                animate={(prefersReducedMotion || isMobile) ? {} : { top: ["0%", "85%", "0%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.8 }}
              />
            </div>

            {/* Top accent gradient line */}
            <div className={`h-[2px] bg-gradient-to-r ${accent.gradient} ${enableHover ? "opacity-40 group-hover:opacity-90" : "opacity-70"} transition-opacity duration-500`} />

            <div className="p-6 sm:p-7 lg:p-8 pl-7 sm:pl-8 lg:pl-9">
              {/* Icon + Title row */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className={`w-12 h-12 rounded-xl ${accent.iconBg} ring-1 ${accent.iconRing} flex items-center justify-center ${accent.iconColor} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                >
                  {profile.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    {profile.title}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">{profile.subtitle}</p>
                </div>
              </div>

              {/* Pain point — muted quote */}
              <p className="text-sm text-gray-400 italic leading-relaxed mb-5">
                &ldquo;{profile.painPoint}&rdquo;
              </p>

              {/* Separator */}
              <div className="h-px bg-gray-100 mb-5" />

              {/* Solution — prominent */}
              <p className="text-[15px] text-gray-700 leading-relaxed mb-6">
                {profile.solution}
              </p>

              {/* Metrics */}
              <div className="flex gap-3 mb-6">
                {profile.metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`flex-1 rounded-xl ${accent.iconBg} p-3 text-center`}
                  >
                    <p className={`text-lg font-bold ${accent.iconColor}`}>{m.value}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tag */}
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium ${accent.tag}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {profile.tag}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TargetAudienceSection() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const skipInfinite = prefersReducedMotion || isMobile;

  // ── 3D Infinite Carousel (mobile & tablet < 1024px) ──
  const TOTAL = AUDIENCE_PROFILES.length;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const touchRef = useRef({ startX: 0, startY: 0 });
  const isSnapping = useRef(false);

  // Extended track: [clone-last, real-0, real-1, real-2, clone-first]
  const extendedIndices = [TOTAL - 1, ...Array.from({ length: TOTAL }, (_, i) => i), 0];
  // slideIndex 1..TOTAL = real items, 0 and TOTAL+1 = clones
  const [slideIndex, setSlideIndex] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Real active index for dots (0-based)
  const realIndex = slideIndex <= 0 ? TOTAL - 1
    : slideIndex > TOTAL ? 0
    : slideIndex - 1;

  // Measure carousel container
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.offsetWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Carousel geometry — center the active card
  const carouselGap = 16;
  const cardWidth = containerWidth > 0 ? Math.min(containerWidth * 0.85, 420) : 0;
  const trackX = containerWidth > 0
    ? (containerWidth / 2) - (cardWidth / 2) - slideIndex * (cardWidth + carouselGap)
    : 0;

  // Infinite loop: snap from clone back to real item
  useEffect(() => {
    if (slideIndex === 0 || slideIndex === TOTAL + 1) {
      isSnapping.current = true;
      const snapTarget = slideIndex === 0 ? TOTAL : 1;
      const timer = setTimeout(() => {
        setShouldAnimate(false);
        setSlideIndex(snapTarget);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setShouldAnimate(true);
            isSnapping.current = false;
          });
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [slideIndex, TOTAL]);

  // Navigation — guarded against rapid-fire during snap
  const goNext = useCallback(() => {
    if (isSnapping.current) return;
    setSlideIndex(prev => prev + 1);
  }, []);
  const goPrev = useCallback(() => {
    if (isSnapping.current) return;
    setSlideIndex(prev => prev - 1);
  }, []);

  // Touch swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isSnapping.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setSlideIndex(prev => prev + 1);
      else setSlideIndex(prev => prev - 1);
    }
  }, []);

  return (
    <section id="audience" className="relative py-12 md:py-16 lg:py-20 overflow-hidden">
      {/* Smooth edge transitions */}
      <div className="absolute top-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-b from-[#FEF3EE] to-transparent z-[1] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-t from-[#FEF3EE] to-transparent z-[1] pointer-events-none" />

      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0.25 }}
          animate={skipInfinite ? {} : { opacity: [0.25, 0.45, 0.25], scale: [1, 1.12, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/3 -left-1/4 w-[65%] h-[65%] bg-cyan-200/30 rounded-full blur-[150px]"
        />
        <motion.div
          initial={{ opacity: 0.2 }}
          animate={skipInfinite ? {} : { opacity: [0.2, 0.38, 0.2], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/4 -right-1/3 w-[55%] h-[55%] bg-violet-200/25 rounded-full blur-[150px]"
        />
        <motion.div
          initial={{ opacity: 0.18 }}
          animate={skipInfinite ? {} : { opacity: [0.18, 0.32, 0.18], scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute -bottom-1/4 left-1/4 w-[50%] h-[50%] bg-amber-200/25 rounded-full blur-[130px]"
        />
        <motion.div
          initial={{ opacity: 0.1 }}
          animate={skipInfinite ? {} : { opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] bg-gradient-to-r from-cyan-200/15 via-violet-200/10 to-amber-200/15 rounded-full blur-[180px]"
        />

        {!skipInfinite && [
          { top: "18%", left: "10%", d: 7, del: 0, s: 2 },
          { top: "32%", left: "82%", d: 9, del: 1.5, s: 3 },
          { top: "55%", left: "22%", d: 6, del: 2.5, s: 2 },
          { top: "72%", left: "68%", d: 8, del: 1, s: 2 },
          { top: "45%", left: "6%", d: 7.5, del: 3, s: 3 },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ top: p.top, left: p.left, width: p.s, height: p.s, background: "radial-gradient(circle, rgba(200,200,210,0.5) 0%, rgba(200,200,210,0) 70%)" }}
            animate={{ y: [0, -15, 0], opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: p.del }}
          />
        ))}

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="text-center mb-12 lg:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-gray-200/60 backdrop-blur-md mb-6 lg:mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#F8935D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F8935D]" />
            </span>
            <span className="text-sm font-medium text-gray-600">Conçu pour vous</span>
          </motion.div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 lg:mb-6 tracking-tight">
            <span className="text-silver-shimmer">À qui s&apos;adresse</span>{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                Posty ?
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-[#F8935D]/20 to-[#F76B54]/20 blur-2xl -z-10" aria-hidden="true" />
            </span>
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Chaque professionnel a un d&eacute;fi LinkedIn. Posty le r&eacute;sout en 30 secondes.
          </p>
        </motion.div>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Mobile & Tablet: 3D Infinite Carousel (< 1024px)             */}
        {/* ────────────────────────────────────────────────────────────── */}
        <div className="lg:hidden" ref={carouselRef}>
          <div className="relative">
            {/* ← Arrow */}
            <button
              onClick={goPrev}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20
                w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60
                shadow-sm flex items-center justify-center text-gray-500
                hover:bg-white hover:text-gray-900 active:scale-90 transition-all duration-150"
              aria-label="Carte précédente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* → Arrow */}
            <button
              onClick={goNext}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20
                w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60
                shadow-sm flex items-center justify-center text-gray-500
                hover:bg-white hover:text-gray-900 active:scale-90 transition-all duration-150"
              aria-label="Carte suivante"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Carousel viewport */}
            <div
              className="overflow-hidden"
              style={{ perspective: "1200px" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <motion.div
                className="flex"
                style={{ gap: `${carouselGap}px` }}
                animate={{ x: trackX }}
                transition={
                  !shouldAnimate
                    ? { duration: 0 }
                    : prefersReducedMotion
                      ? { duration: 0.3, ease: "easeOut" }
                      : { type: "spring", stiffness: 260, damping: 28 }
                }
              >
                {extendedIndices.map((profileIdx, trackPos) => {
                  const offset = trackPos - slideIndex;
                  return (
                    <motion.div
                      key={`carousel-${trackPos}`}
                      className="flex-shrink-0"
                      style={{
                        width: cardWidth > 0 ? `${cardWidth}px` : "85vw",
                        transformStyle: "preserve-3d",
                      }}
                      animate={{
                        rotateY: prefersReducedMotion ? 0 : offset * -15,
                        scale: offset === 0 ? 1 : 0.85,
                        opacity: offset === 0 ? 1 : 0.5,
                      }}
                      transition={
                        !shouldAnimate
                          ? { duration: 0 }
                          : prefersReducedMotion
                            ? { duration: 0.3, ease: "easeOut" }
                            : { type: "spring", stiffness: 260, damping: 28 }
                      }
                    >
                      <AudienceCard profile={AUDIENCE_PROFILES[profileIdx]} index={profileIdx} />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-2.5 mt-8">
            {AUDIENCE_PROFILES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i + 1)}
                className={`rounded-full transition-all duration-300 ${
                  i === realIndex
                    ? "h-2.5 w-8 bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-sm shadow-[#F8935D]/30"
                    : "h-2.5 w-2.5 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Voir ${AUDIENCE_PROFILES[i].title}`}
              />
            ))}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* Desktop: 3-column Grid (>= 1024px)                           */}
        {/* ────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          {AUDIENCE_PROFILES.map((profile, index) => (
            <AudienceCard key={profile.title} profile={profile} index={index} />
          ))}
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
    glow: string;         // Glow effect
    accent: string;       // Accent details
    titleGradient: string; // Title text gradient
  };
  badge: string;
  tierBadge?: string;     // Optional plan tier badge (e.g. "Max")
}

// =============================================================================
// FEATURE MOCKUPS — Mini app UI previews for each feature card
// =============================================================================

function MockupMultiPlatform() {
  const platforms = [
    { name: "LinkedIn", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    ), color: "#0A66C2", selected: true, status: "Connecté" },
    { name: "Reddit", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.461 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.206-.095z"/></svg>
    ), color: "#FF4500", selected: true, status: "Bientôt disponible", comingSoon: true },
    { name: "Threads", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.10-1.14 3.531-1.208 1.027-.046 1.98.042 2.857.262-.085-.758-.286-1.373-.6-1.833-.453-.667-1.16-1.014-2.101-1.032h-.06c-.724.012-1.6.246-2.143.787l-1.46-1.39c.867-.913 2.09-1.39 3.553-1.416h.084c1.508.024 2.674.58 3.47 1.65.717.962 1.09 2.273 1.11 3.895l.003.236c.92.339 1.706.839 2.34 1.497.856.886 1.363 2.084 1.463 3.455.118 1.606-.36 3.244-1.39 4.747C18.86 22.812 16.13 23.98 12.186 24zm-1.14-8.376c-.94.042-1.672.284-2.173.72-.465.404-.685.905-.655 1.49.038.734.46 1.281 1.187 1.536.485.17 1.042.237 1.634.2 1.078-.06 1.884-.46 2.395-1.095.434-.54.704-1.28.81-2.216-.86-.2-1.791-.286-2.718-.286-.16 0-.32.003-.48.01z"/></svg>
    ), color: "#000000", selected: true, status: "Connecté" },
    { name: "Facebook", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ), color: "#1877F2", selected: true, status: "Connecté" },
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8935D]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F76B54]/8 rounded-full blur-2xl" />

      {/* Header - matches real app */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Publier sur</span>
      </div>

      {/* Platform grid - 2 columns like real app */}
      <div className="grid grid-cols-2 gap-2 relative z-10 flex-1">
        {platforms.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
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
                  Bientôt
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
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="mt-3 relative z-10 flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-[11px] text-[#F8935D] font-medium">Débloquer plus de plateformes</span>
      </motion.div>
    </div>
  );
}

function MockupScheduler() {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
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
          Liste
        </div>
        <div className="flex-1 px-2 py-1 text-[9px] font-medium rounded-md bg-white text-gray-900 text-center shadow-sm">
          Calendrier
        </div>
      </div>

      {/* Month navigation - like real app with < > arrows */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[11px] text-gray-900 font-bold">Février 2025</span>
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
  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-red-400/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-400/5 rounded-full blur-2xl" />

      {/* Header - like real app "2 versions disponibles" with dots */}
      <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
        <span className="text-[10px] text-gray-400">2 versions disponibles</span>
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
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Gradient header bar like real app */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-[#F85751]/10 to-[#F85751]/5 border-b border-gray-100">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-[#F85751]/15 text-[#F85751] border border-[#F85751]/20">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Storytelling
            </span>
          </div>
          {/* Content preview */}
          <div className="px-2.5 py-2 flex-1">
            <div className="text-[8px] text-gray-600 leading-relaxed line-clamp-4">
              Il y a 2 ans, j&apos;ai failli tout abandonner. Mon business stagnait, mes posts n&apos;avaient aucun impact...
            </div>
          </div>
          {/* Actions like real app */}
          <div className="px-2 py-1.5 border-t border-gray-100 flex gap-1">
            <div className="flex-1 py-1 rounded text-center text-[7px] text-gray-500 bg-gray-50 font-medium">Copier</div>
            <div className="flex-1 py-1 rounded text-center text-[7px] text-white bg-[#0A66C2] font-medium">Publier</div>
          </div>
        </motion.div>

        {/* Business - primary/orange like real app */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Gradient header bar like real app */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-[#F8935D]/10 to-[#F8935D]/5 border-b border-gray-100">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-[#F8935D]/15 text-[#F8935D] border border-[#F8935D]/20">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Business
            </span>
          </div>
          {/* Content preview */}
          <div className="px-2.5 py-2 flex-1">
            <div className="text-[8px] text-gray-600 leading-relaxed line-clamp-4">
              3 stratégies qui ont généré +40% de leads qualifiés en B2B ce trimestre. La méthode complète...
            </div>
          </div>
          {/* Actions like real app */}
          <div className="px-2 py-1.5 border-t border-gray-100 flex gap-1">
            <div className="flex-1 py-1 rounded text-center text-[7px] text-gray-500 bg-gray-50 font-medium">Copier</div>
            <div className="flex-1 py-1 rounded text-center text-[7px] text-white bg-[#0A66C2] font-medium">Publier</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MockupContextProfile() {
  const profileFields = [
    { label: "Secteur", value: "Tech / SaaS B2B", icon: "🏢" },
    { label: "Audience", value: "Founders, CMOs, VPs", icon: "🎯" },
    { label: "Ton", value: "Professionnel & direct", icon: "🎤" },
    { label: "Style", value: "Concis, data-driven", icon: "✍️" },
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-white via-gray-50 to-white p-4 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <span className="text-[11px] text-gray-500 font-medium">Votre profil Posty</span>
        <span className="ml-auto text-[10px] text-emerald-500 font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          Complété
        </span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-3 relative z-10 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-amber-500/20">
          EN
        </div>
        <div>
          <div className="text-[12px] text-gray-900 font-semibold">Emilien Nepveu</div>
          <div className="text-[10px] text-gray-500">Co-Founder &middot; Co-CEO</div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-2 flex-1 relative z-10">
        {profileFields.map((field, i) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.35 }}
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
          <span className="text-[9px] text-gray-400">Personnalisation</span>
          <span className="text-[9px] text-amber-500 font-semibold">100%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

const FEATURES: FeatureConfig[] = [
  {
    title: "1 post, 4 plateformes, 4x plus de visibilité",
    description: "Publiez sur LinkedIn, Threads, Facebook — et bientôt Reddit. Un seul contenu touche 4 audiences. Plus de visibilité, plus de prospects entrants.",
    mockup: <MockupMultiPlatform />,
    badge: "Multi-plateforme",
    tierBadge: "Max",
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
      badge: "bg-orange-100",
      badgeText: "text-orange-700",
      glow: "shadow-[#F8935D]/20",
      accent: "text-[#F76B54]",
      titleGradient: "from-[#F8935D] via-[#FBB9AD] to-slate-300",
    },
  },
  {
    title: "Publiez au bon moment, chaque jour, sans y penser",
    description: "Programmez vos posts aux créneaux où votre audience est la plus active. L'algorithme récompense le bon timing — Posty s'en charge pour vous.",
    mockup: <MockupScheduler />,
    badge: "Arrive très bientôt",
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
      titleGradient: "from-violet-600 via-purple-400 to-slate-300",
    },
  },
  {
    title: "De l'idée au post en 30 secondes",
    description: "Décrivez votre objectif. Posty génère deux versions calibrées : Storytelling pour créer le lien, Business pour déclencher la prise de contact.",
    mockup: <MockupDualGeneration />,
    badge: "Génération IA",
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
      titleGradient: "from-emerald-600 via-emerald-400 to-slate-300",
    },
  },
  {
    title: "Chaque post sonne comme vous",
    description: "Dès votre inscription, Posty apprend votre secteur, votre audience cible et votre ton. Résultat : des posts que vos prospects reconnaissent comme experts, pas du contenu IA générique.",
    mockup: <MockupContextProfile />,
    badge: "IA Contextuelle",
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
      titleGradient: "from-amber-600 via-orange-400 to-slate-300",
    },
  },
];

function FeatureCard({ feature, index }: { feature: FeatureConfig; index: number }) {
  const isEven = index % 2 === 0;
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D perspective tilt — desktop only, driven by cursor position
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rawRotateX = useTransform(mouseY, [0, 1], [4, -4]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-4, 4]);
  const rotateX = useSpring(rawRotateX, { stiffness: 120, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 120, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion || isMobile) return;
    const rect = card.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseX.set(nx);
    mouseY.set(ny);
  }, [mouseX, mouseY, prefersReducedMotion, isMobile]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  // Strip hover: classes from border string on mobile
  const borderClasses = isMobile
    ? feature.color.border.replace(/hover:\S+/g, "")
    : feature.color.border;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      className={isMobile ? "" : "group/card"}
      style={isMobile ? undefined : { perspective: 1200 }}
    >
      <motion.div
        style={isMobile ? undefined : {
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`
          relative bg-gradient-to-br ${feature.color.bg}
          border ${borderClasses} rounded-[clamp(1rem,2vw,1.5rem)]
          px-[clamp(1.25rem,2.5vw,2rem)] py-[clamp(1rem,1.8vw,1.5rem)]
          shadow-sm ${isMobile ? '' : `hover:shadow-xl ${feature.color.glow}`}
          transition-shadow duration-300
        `}
      >
        {/* Ambient hover glow — desktop only */}
        {!isMobile && (
          <div
            className="absolute -inset-4 rounded-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none -z-10"
            style={{ background: `radial-gradient(min(500px, 35vw) circle at 50% 30%, rgba(248, 147, 93, 0.12), transparent 60%)` }}
          />
        )}

        {/* Inner flex layout: image + content */}
        <div className={`relative z-10 flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-[clamp(1.5rem,3vw,2rem)] items-center`}>

        {/* Visual — Centered Mockup — overflows card vertically for premium feel */}
        <div className="w-full lg:w-[42%] flex-shrink-0 flex items-center justify-center relative lg:my-[clamp(-1.5rem,-2vw,-2.5rem)]">

          {/* App mockup — compact, uniform size */}
          {feature.mockup && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
            <span
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                ${feature.color.badge} ${feature.color.badgeText}
                text-xs font-semibold shadow-lg
              `}
            >
              <span className={`w-2 h-2 rounded-full ${feature.color.iconBg} animate-pulse`} />
              {feature.badge}
            </span>
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
          <h3 className={`text-[clamp(1.2rem,2.5vw,1.875rem)] font-bold mb-[clamp(0.5rem,1vw,0.75rem)] leading-tight text-transparent bg-clip-text bg-gradient-to-r ${feature.color.titleGradient}`}>
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-[clamp(0.9rem,1.2vw,1.125rem)] leading-relaxed mb-[clamp(1rem,1.5vw,1.25rem)]">
            {feature.description}
          </p>

          {/* CTA Link with arrow slide on hover */}
          <div>
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
                Essayer gratuitement
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

function FeaturesSection() {
  const isMobile = useIsMobile();

  return (
    <section id="features" className="py-[clamp(1.5rem,3vw,2.5rem)] px-[clamp(1rem,4vw,3rem)] overflow-hidden">
      <div className="w-full max-w-[min(90vw,67.75rem)] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
          whileInView={{ opacity: 1, y: 0, scale: 1, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: premiumEase }}
          className="text-center mb-[clamp(1.25rem,2vw,1.75rem)]"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-bold">
            <span className="text-silver-premium">Tout ce qu&apos;il vous faut pour</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              attirer des clients sur LinkedIn
            </span>
          </h2>
        </motion.div>

        {/* Features Grid with Connectors */}
        <div className="relative space-y-[clamp(1.25rem,2vw,1.75rem)]">
          {/* Vertical connector line — desktop only */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-0.5 h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent origin-top mx-auto"
            />
          </div>

          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="relative">
              <FeatureCard feature={feature} index={index} />
            </div>
          ))}
        </div>

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

const TESTIMONIALS = [
  {
    name: "Alexandre M.",
    role: "Fondateur",
    company: "Agence B2B",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    quote: "Avant Posty, je publiais une fois par semaine sans savoir quoi dire. Aujourd'hui, je poste chaque jour et LinkedIn est devenu mon premier canal d'acquisition. J'ai signé 3 clients en 2 mois.",
  },
  {
    name: "Sophie L.",
    role: "Directrice Marketing",
    company: "SaaS B2B",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    quote: "Mon équipe gagne 5 heures par semaine sur le contenu. On réinvestit ce temps en stratégie et prospection. Nos posts sont plus réguliers, et l'engagement a triplé en 30 jours.",
  },
  {
    name: "Marc D.",
    role: "Consultant indépendant",
    company: "",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    quote: "Posty me génère un post par jour qui sonne comme moi, sans sacrifier le temps que je consacre à mes missions clients. LinkedIn est enfin rentable pour moi.",
  },
];

function TestimonialsSection() {
  const isMobile = useIsMobile();
  return (
    <section id="testimonials" className="py-12 md:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-12 overflow-hidden">
      <div className="max-w-[1084px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
          whileInView={{ opacity: 1, y: 0, scale: 1, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: premiumEase }}
          className="text-center mb-8 md:mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white border border-gray-200 rounded-full shadow-sm"
          >
            <div className="flex -space-x-2">
              {TESTIMONIALS.slice(0, 3).map((t, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                  <Image src={t.image} alt={`Photo de ${t.name}`} width={24} height={24} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600 font-medium">Retours d&apos;utilisateurs Posty</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-silver-premium">Ils publient. Ils</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              convertissent.
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Des professionnels comme vous qui signent des clients grâce à LinkedIn.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30, scale: 0.95, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
              whileInView={{ opacity: 1, y: 0, scale: 1, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: index * 0.12, duration: 0.6, ease: premiumEase }}
              className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#F8935D]/30 transition-all duration-300 shadow-lg shadow-gray-100/60 hover:shadow-xl hover:shadow-[#F8935D]/10"
            >
              <div className="p-6">
                {/* Author — photo + name/role on same line */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-[#F8935D]/30 transition-all duration-300 flex-shrink-0">
                    <Image src={testimonial.image} alt={testimonial.name} width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{testimonial.name}</p>
                    <p className="text-gray-500 text-xs truncate">{testimonial.role}{testimonial.company ? ` · ${testimonial.company}` : ""}</p>
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-gray-700 text-[15px] leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
              </div>
            </motion.div>
          ))}
        </div>

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

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
          whileInView={{ opacity: 1, y: 0, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-silver-shimmer">Ce qui change</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              avec Posty
            </span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
            Le quotidien LinkedIn de nos utilisateurs, avant et après.
          </p>
        </motion.div>

        {/* Mock-up Comparison — Two browser panels */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 lg:gap-0 items-start">

          {/* ── BEFORE — Mock LinkedIn (gray, empty, frustrating) ── */}
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: premiumEase }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                Sans Posty
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
                    <span className="text-gray-300 text-sm">À quoi pensez-vous ?</span>
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
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Prospect</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-gray-300">~2h</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Par post</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-gray-300">1×/mois</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Fréquence</p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <p className="mt-4 text-sm text-gray-400 italic text-center px-2">
              &ldquo;Le dimanche soir, je cherche encore quoi poster...&rdquo;
            </p>
          </motion.div>

          {/* ── ARROW ── */}
          <div className="hidden lg:flex items-center justify-center self-center px-5">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0, rotate: -90 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
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
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
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
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: premiumEase }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-[#F8935D]/10 text-[#F8935D] text-xs font-semibold uppercase tracking-wider">
                Avec Posty
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
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 20 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Généré en 30s
                  </motion.span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F8935D]/10 text-[#F8935D] text-[10px] font-medium">
                    Optimisé pour l&apos;algorithme
                  </span>
                </div>

                {/* Post preview */}
                <div className="rounded-xl border border-[#F8935D]/15 bg-gradient-to-br from-[#FEF3EE]/30 to-transparent p-4 min-h-[88px]">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    &ldquo;Les dirigeants qui réussissent sur LinkedIn partagent une habitude : ils publient chaque jour un contenu qui parle à leur audience...&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F8935D]/10">
                    <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-xs font-semibold shadow-sm">
                      Publier maintenant
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ou planifier pour demain 8h
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-3 divide-x divide-[#F8935D]/10 border-t border-[#F8935D]/10">
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">12</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Prospects/mois</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">×3</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Engagement</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-lg font-bold text-[#F8935D]">1/jour</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Fréquence</p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <p className="mt-4 text-sm text-[#F8935D] font-medium text-center px-2">
              &ldquo;LinkedIn est devenu mon premier canal d&apos;acquisition.&rdquo;
            </p>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-14 md:mt-20"
        >
          <p className="text-gray-500 text-sm md:text-base mb-5">
            Rejoignez les professionnels qui signent des clients chaque mois grâce à LinkedIn
          </p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/20 hover:shadow-xl hover:shadow-[#F8935D]/30 transition-all duration-300"
            >
              Commencer mon essai gratuit
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
const FOUNDER_LINKEDIN_URL = "https://www.linkedin.com/in/e-nepveu-58a38127a/";
const CFO_LINKEDIN_URL = "https://www.instagram.com/come27m/";

function FounderSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Scroll-based animation: track section progress through viewport
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"], // Start when section enters, complete at center
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
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: smoothEase }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="flex justify-center mb-6">
            <svg className="w-10 h-10 md:w-12 md:h-12 text-[#F8935D]/20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-[2.5rem] 2xl:text-[2.75rem] font-medium text-gray-900 leading-snug md:leading-tight tracking-tight">
            LinkedIn est le levier de croissance le plus sous-exploité du B2B. J&apos;ai créé{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              Posty
            </span>
            {" "}parce que chaque entrepreneur mérite de signer des clients grâce à ses posts — sans y passer des heures.
          </p>
        </motion.blockquote>

        {/* Co-founders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          {/* Photos row */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mb-4">
            <Link
              href={FOUNDER_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2"
              aria-label="Voir le profil LinkedIn d'Emilien Nepveu"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden ring-4 ring-white shadow-xl shadow-gray-200/50">
                <Image src="/founder.jpg" alt="Emilien Nepveu" width={64} height={64} className="w-full h-full object-cover" />
              </div>
            </Link>
            <Link
              href={CFO_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D] focus-visible:ring-offset-2"
              aria-label="Voir le profil de Côme Maubert"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden ring-4 ring-white shadow-xl shadow-gray-200/50">
                <Image src="/cmo.jpg" alt="Côme Maubert" width={64} height={64} className="w-full h-full object-cover" />
              </div>
            </Link>
          </div>

          {/* Shared role badge — juste sous les photos */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-10 sm:w-14 bg-gradient-to-r from-transparent to-[#F8935D]/30" />
            <span className="text-gray-500 text-[11px] md:text-xs font-medium tracking-[0.14em] uppercase select-none">
              Co-fondateurs & Co-CEO
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
                  Emilien Nepveu
                  <span className="absolute left-0 -bottom-0.5 w-full h-[2px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] origin-left scale-x-0 md:group-hover:scale-x-100 transition-transform duration-300 ease-out rounded-full" />
                </span>
              </Link>
              <p className="text-gray-400 text-[11px] md:text-xs tracking-wide mt-0.5">CTO</p>
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
                  Côme Maubert
                  <span className="absolute left-0 -bottom-0.5 w-full h-[2px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] origin-left scale-x-0 md:group-hover:scale-x-100 transition-transform duration-300 ease-out rounded-full" />
                </span>
              </Link>
              <p className="text-gray-400 text-[11px] md:text-xs tracking-wide mt-0.5">CFO</p>
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <section id="pricing" className="py-16 md:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-12 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: premiumEase }}
          className="text-center mb-10 sm:mb-12 md:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
            <span className="text-gray-900">Le prix d&apos;un café par jour.</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              Le retour d&apos;un commercial à plein temps.
            </span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10">
            Un seul client signé via LinkedIn rembourse votre année entière. Quel plan correspond à vos ambitions ?
          </p>

          <BillingToggle
            isYearly={billingPeriod === "yearly"}
            onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
            savingsLabel="2 mois offerts"
            showSavings={true}
          />
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-5xl mx-auto items-start">
          {PLANS.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriod}
              index={index}
              ctaHref="/signup"
            />
          ))}
        </div>

        {/* Trust badges */}
        <PricingTrustBadges className="mt-10 sm:mt-12 md:mt-16" />
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
  return (
    <section id={id} className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight"
        >
          {headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-gray-500 text-base md:text-lg mb-8"
        >
          {subtext}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 h-12 md:h-14 px-7 md:px-9 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm md:text-base font-semibold rounded-xl shadow-lg shadow-[#F8935D]/15 hover:shadow-xl hover:shadow-[#F8935D]/25 transition-all duration-300"
          >
            {ctaLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-5 text-xs text-gray-400"
        >
          Essai gratuit inclus &middot; Sans engagement
        </motion.p>
      </div>
    </section>
  );
}

// =============================================================================
// FAQ SECTION - Accordion-Style Questions & Answers
// =============================================================================
const FAQ_ITEMS = [
  {
    question: "Comment ça marche, concrètement ?",
    answer: "Décrivez votre objectif (trouver des clients, renforcer votre crédibilité, etc.) et Posty génère instantanément deux versions de post optimisées pour LinkedIn. Vous pouvez aussi dicter vos idées à la voix. C'est prêt en 30 secondes.",
  },
  {
    question: "Est-ce vraiment de l\u2019IA ou juste des templates ?",
    answer: "Posty génère du contenu 100% original à chaque fois. Pas de templates pré-écrits. L\u2019IA analyse votre secteur, votre audience et votre ton pour créer des posts uniques qui sonnent comme vous \u2014 pas comme un robot.",
  },
  {
    question: "Les posts auront-ils l\u2019air d\u2019être écrits par moi ?",
    answer: "Absolument. Posty s\u2019adapte à votre voix, votre style et votre positionnement. Plus vous l\u2019utilisez, plus il comprend votre ton. Vos lecteurs ne feront pas la différence avec un post que vous auriez écrit vous-même.",
  },
  {
    question: "Quels résultats vais-je obtenir ?",
    answer: "En publiant régulièrement avec Posty, nos utilisateurs constatent un engagement triplé en 30 jours. Les premiers clients signés via LinkedIn arrivent entre 60 et 90 jours. À ce stade, un seul contrat rembourse généralement une année entière d\u2019abonnement.",
  },
  {
    question: "Puis-je annuler à tout moment ?",
    answer: "Oui, sans aucun engagement. Vous pouvez annuler votre abonnement en un clic depuis vos paramètres. Pas de frais cachés, pas de période d\u2019engagement minimum.",
  },
  {
    question: "Dois-je déjà être actif sur LinkedIn ?",
    answer: "Pas nécessairement. Posty est idéal aussi bien pour ceux qui débutent sur LinkedIn que pour les profils déjà établis. Si vous partez de zéro, Posty vous aide à construire votre présence rapidement avec une stratégie de contenu cohérente.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Vos données sont chiffrées et hébergées en Europe, conformément au RGPD. Nous ne partageons jamais vos informations avec des tiers. Votre contenu généré vous appartient intégralement.",
  },
  {
    question: "Qu\u2019est-ce qui différencie Posty de ChatGPT ?",
    answer: "ChatGPT écrit du texte. Posty écrit des posts LinkedIn qui génèrent des prospects. Chaque post est optimisé pour l\u2019algorithme, structuré pour déclencher des prises de contact, et calibré sur votre positionnement exact. C\u2019est la différence entre un outil générique et un expert dédié à votre acquisition LinkedIn.",
  },
];

function FaqItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: smoothEase }}
      className="border-b border-gray-200 last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  return (
    <section id="faq" className="relative py-16 md:py-24 2xl:py-28 px-4 sm:px-6 lg:px-8 2xl:px-12 overflow-hidden">
      <div className="relative z-[1] max-w-3xl 2xl:max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
          whileInView={{ opacity: 1, y: 0, scale: 1, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: premiumEase }}
          className="text-center mb-10 md:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 mb-6"
          >
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#F8935D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F8935D]"></span>
            </span>
            <span className="text-sm font-medium text-gray-700">Questions fréquentes</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-5">
            Tout ce que vous devez savoir{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              avant de commencer
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Si la réponse à votre question n&apos;est pas ici, écrivez-nous : on répond en moins de 24h.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100/60 px-8">
          {FAQ_ITEMS.map((item, index) => (
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
  return (
    <footer className="border-t border-[#F0D5C8]/40 py-8 md:py-16 2xl:py-20 px-4 sm:px-6 lg:px-8 2xl:px-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: smoothEase }}
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
                <span className="text-sm font-bold text-gray-900">Posty</span>
              </Link>
              <p className="text-[10px] text-gray-500 leading-tight max-w-[200px]">
                Vos posts LinkedIn, calibrés pour signer des clients.
              </p>
              <p className="text-[10px] text-[#F8935D] font-medium mt-1">
                Chaque post peut vous amener un client
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href="https://www.linkedin.com/company/posty" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-colors" aria-label="LinkedIn">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://x.com/posty" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-colors" aria-label="X (Twitter)">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </div>

          {/* Links — 3 columns: Navigation | Legal | Account */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-4 text-[11px]">
            {/* Navigation */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">Navigation</p>
              <button onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Caractéristiques</button>
              <button onClick={() => document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Témoignages</button>
              <button onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Tarifs</button>
              <button onClick={() => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })} className="block text-left text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">FAQ</button>
            </div>
            {/* Legal */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">Légal</p>
              <Link href="/legal/privacy" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Confidentialité</Link>
              <Link href="/legal/terms" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">CGU</Link>
              <Link href="/legal/notices" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Mentions légales</Link>
              <Link href="/legal/cookies" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Cookies</Link>
            </div>
            {/* Account */}
            <div>
              <p className="text-gray-800 font-semibold mb-1.5 text-[10px] uppercase tracking-wide">Compte</p>
              <Link href="/login" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Connexion</Link>
              <Link href="/signup" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">Inscription</Link>
              <Link href="/about" className="block text-gray-500 hover:text-[#F8935D] transition-colors py-0.5 min-h-[28px]">À propos</Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-3 border-t border-[#F0D5C8]/60 flex items-center justify-between">
            <p className="text-gray-400 text-[10px]">© {new Date().getFullYear()} Posty. Tous droits réservés.</p>
            <p className="text-gray-400 text-[10px]">Conçu en France 🇫🇷</p>
          </div>
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
                <span className="text-xl font-bold text-gray-900">Posty</span>
              </Link>
              <p className="text-gray-500 max-w-sm">
                Posty génère vos posts LinkedIn, calibrés pour votre audience et optimisés pour l&apos;algorithme. Publiez chaque jour, attirez des prospects qualifiés, signez des clients.
              </p>
              <p className="text-[#F8935D] font-medium text-sm mt-3">
                Chaque post est une opportunité.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a href="https://www.linkedin.com/company/posty" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-all duration-200" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
                <a href="https://x.com/posty" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-[#F8935D]/10 flex items-center justify-center text-gray-400 hover:text-[#F8935D] transition-all duration-200" aria-label="X (Twitter)">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Navigation</h4>
              <ul className="space-y-3">
                <li><button onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">Caractéristiques</button></li>
                <li><button onClick={() => document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">Témoignages</button></li>
                <li><button onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">Tarifs</button></li>
                <li><button onClick={() => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-500 hover:text-[#F8935D] transition-colors">FAQ</button></li>
                <li><Link href="/about" className="text-gray-500 hover:text-[#F8935D] transition-colors">À propos</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Légal</h4>
              <ul className="space-y-3">
                <li><Link href="/legal/privacy" className="text-gray-500 hover:text-[#F8935D] transition-colors">Politique de confidentialité</Link></li>
                <li><Link href="/legal/terms" className="text-gray-500 hover:text-[#F8935D] transition-colors">Conditions d&apos;utilisation</Link></li>
                <li><Link href="/legal/notices" className="text-gray-500 hover:text-[#F8935D] transition-colors">Mentions légales</Link></li>
                <li><Link href="/legal/cookies" className="text-gray-500 hover:text-[#F8935D] transition-colors">Politique de cookies</Link></li>
                <li><a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#F8935D] transition-colors">CNIL</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-[#F0D5C8]/60 flex flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Posty. Tous droits réservés.</p>
            <p className="text-gray-500 text-sm">Conçu et hébergé en France</p>
          </div>
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
  const router = useRouter();

  // Force light mode on landing page - ignore system dark mode preference
  // Enable full scrolling (mouse wheel, trackpad, touch, keyboard arrows, space, page up/down)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");

    // Enable scrolling on landing page using CSS class
    document.body.classList.add("landing-scroll-enabled");
    document.documentElement.classList.add("landing-scroll-enabled");

    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "sidebar-open", "landing-no-scroll");
    document.documentElement.classList.remove("landing-no-scroll");

    return () => {
      document.body.classList.remove("landing-scroll-enabled");
      document.documentElement.classList.remove("landing-scroll-enabled");
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
    <>
      {/* Aurora background — fixed full viewport, stars stay in place on scroll */}
      <AuroraBackground />
      <Navbar />
      <div className="min-h-screen text-gray-900 relative">
        {/* Hero Demo Section — opening with descent animation */}
        <DemoSection />

        {/* Opaque sections — z-[5] + bg to cover the fixed hero title */}
        <div className="relative z-[5] bg-[#FEF3EE]">
          <FeaturesSection />
        </div>

        {/* TargetAudience — transparent so aurora stars show through */}
        <div className="relative z-[5]">
          <TargetAudienceSection />
        </div>

        <div className="relative z-[5] bg-[#FEF3EE]">
          <TestimonialsSection />
          <FounderSection />
          <PricingSection />
        </div>

        {/* FAQ — transparent so aurora stars show through */}
        <div className="relative z-[5]">
          <FaqSection />
        </div>

        {/* Footer — opaque, no stars */}
        <div className="relative z-[5] bg-[#FEF3EE]">
          <Footer />
        </div>
      </div>
    </>
  );
}
