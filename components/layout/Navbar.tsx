"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollLock } from "@/hooks/useScrollLock";

interface NavbarProps {
  transparent?: boolean;
}

// Mobile menu animation variants
const overlayVariants = {
  closed: {
    opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
  open: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
};

const menuItemVariants = {
  closed: { opacity: 0, x: -16 },
  open: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.08 + i * 0.06,
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const ctaVariants = {
  closed: { opacity: 0, y: 20 },
  open: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.35, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

// Section definitions
const SECTIONS = {
  demo: { label: "Demo", desktopLabel: "Demo" },
  features: { label: "Caractéristiques", desktopLabel: "Caractéristiques" },
  testimonials: { label: "Témoignages", desktopLabel: "Témoignages" },
  founders: { label: "Fondateurs", desktopLabel: "Fondateurs" },
  pricing: { label: "Tarifs", desktopLabel: "Tarifs" },
} as const;

type SectionId = keyof typeof SECTIONS;

const DESKTOP_SECTIONS: SectionId[] = ["demo", "features", "testimonials", "founders", "pricing"];
const MOBILE_SECTIONS: SectionId[] = ["demo", "features", "testimonials", "pricing"];

// Mobile menu icons per section
function SectionIcon({ id, className }: { id: SectionId; className?: string }) {
  switch (id) {
    case "demo":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "features":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "testimonials":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case "founders":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "pricing":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
  }
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionId>("demo");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Centralized scroll lock when menu is open
  useScrollLock(mobileMenuOpen);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track active section with Intersection Observer
  useEffect(() => {
    const sectionIds: SectionId[] = ["demo", "features", "testimonials", "founders", "pricing"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: 0.3, rootMargin: "-80px 0px -40% 0px" }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navbar bar */}
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${
            isScrolled || !transparent
              ? "bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]"
              : "bg-white/60 backdrop-blur-md md:bg-transparent md:backdrop-blur-none"
          }
        `}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 group min-h-[44px]"
            >
              <span className="font-bold text-xl sm:text-2xl leading-none tracking-tight bg-gradient-to-r from-[#F8935D] to-[#F76B54] bg-clip-text text-transparent">
                POSTY
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" role="navigation">
              {DESKTOP_SECTIONS.map((id) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`
                      relative px-3 xl:px-4 py-2 rounded-lg
                      text-sm font-medium transition-colors duration-200
                      ${isActive
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/60"
                      }
                    `}
                  >
                    {SECTIONS[id].desktopLabel}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0.5 left-3 right-3 xl:left-4 xl:right-4 h-0.5 bg-gradient-to-r from-[#F8935D] to-[#F76B54] rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right side: CTA + hamburger */}
            <div className="flex items-center gap-2.5">
              {/* Desktop CTA */}
              <Link
                href="/login?mode=signup"
                className="hidden md:inline-flex items-center justify-center h-10 px-5 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                {t.common.tryNow || "Essayer gratuitement"}
              </Link>

              {/* Desktop Login */}
              <Link
                href="/login"
                className="hidden sm:inline-flex lg:inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              >
                {t.common.login || "Se connecter"}
              </Link>

              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`
                  relative lg:hidden inline-flex items-center justify-center
                  w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl
                  border transition-colors duration-200
                  ${mobileMenuOpen
                    ? "bg-[#FEF3EE] border-[#F8935D]/30 text-[#F8935D]"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileMenuOpen}
              >
                <motion.svg
                  animate={mobileMenuOpen ? "open" : "closed"}
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <motion.path
                    variants={{
                      closed: { d: "M4 6L20 6" },
                      open: { d: "M6 6L18 18" },
                    }}
                    transition={{ duration: 0.2 }}
                    strokeLinecap="round"
                    strokeWidth={2}
                  />
                  <motion.path
                    variants={{
                      closed: { opacity: 1 },
                      open: { opacity: 0 },
                    }}
                    transition={{ duration: 0.15 }}
                    d="M4 12L20 12"
                    strokeLinecap="round"
                    strokeWidth={2}
                  />
                  <motion.path
                    variants={{
                      closed: { d: "M4 18L20 18" },
                      open: { d: "M6 18L18 6" },
                    }}
                    transition={{ duration: 0.2 }}
                    strokeLinecap="round"
                    strokeWidth={2}
                  />
                </motion.svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            {/* Light premium background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8F5] to-white" />

            {/* Subtle warm radial accent */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at top right, rgba(248,147,93,0.08) 0%, transparent 60%)"
              }}
            />

            {/* Content */}
            <div
              className="relative h-full flex flex-col"
              style={{
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 72px)",
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
              }}
            >
              {/* Navigation items */}
              <nav className="flex-1 flex flex-col justify-center px-6 sm:px-8" role="navigation">
                <div className="space-y-2">
                  {MOBILE_SECTIONS.map((id, index) => {
                    const isActive = activeSection === id;
                    return (
                      <motion.button
                        key={id}
                        custom={index}
                        variants={menuItemVariants}
                        initial="closed"
                        animate="open"
                        onClick={() => scrollToSection(id)}
                        className={`
                          group w-full flex items-center gap-4 px-5 py-4 rounded-2xl
                          transition-colors duration-200
                          ${isActive
                            ? "bg-white shadow-md shadow-[#F8935D]/10 border border-[#F8935D]/20"
                            : "bg-white/50 border border-transparent hover:bg-white hover:shadow-sm active:bg-white active:shadow-sm"
                          }
                        `}
                      >
                        {/* Icon */}
                        <div className={`
                          flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                          transition-colors duration-200
                          ${isActive
                            ? "bg-gradient-to-br from-[#F8935D] to-[#F76B54] text-white shadow-sm"
                            : "bg-[#FEF3EE] text-[#F8935D]/70 group-hover:text-[#F8935D]"
                          }
                        `}>
                          <SectionIcon id={id} className="w-5 h-5" />
                        </div>

                        {/* Label */}
                        <span className={`
                          text-lg font-semibold flex-1 text-left
                          transition-colors duration-200
                          ${isActive ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"}
                        `}>
                          {SECTIONS[id].label}
                        </span>

                        {/* Arrow */}
                        <svg
                          className={`
                            w-5 h-5 flex-shrink-0 transition-colors duration-200
                            ${isActive ? "text-[#F8935D]" : "text-gray-300 group-hover:text-gray-400"}
                          `}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    );
                  })}
                </div>
              </nav>

              {/* Bottom CTA section */}
              <motion.div
                variants={ctaVariants}
                initial="closed"
                animate="open"
                className="px-6 sm:px-8 pb-4"
              >
                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

                <div className="space-y-3">
                  {/* Primary CTA */}
                  <Link
                    href="/login?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="
                      relative flex items-center justify-center gap-2
                      w-full h-14 px-6 overflow-hidden
                      bg-gradient-to-r from-[#F8935D] to-[#F76B54]
                      text-white font-bold text-base
                      rounded-2xl shadow-lg shadow-[#F8935D]/25
                      active:scale-[0.98] transition-transform duration-150
                    "
                  >
                    {t.common.tryNow || "Commencer gratuitement"}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>

                  {/* Secondary — Login */}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="
                      flex items-center justify-center gap-2
                      w-full h-12 px-6
                      text-gray-600 font-medium text-sm
                      bg-white border border-gray-200
                      rounded-xl
                      hover:border-gray-300 hover:text-gray-900
                      active:scale-[0.98] transition-all duration-200
                    "
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.common.login || "Se connecter"}
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="mt-5 flex items-center justify-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
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
