"use client";

/**
 * LandingNavbar — Shared navbar with the exact same design as the landing page.
 * Used on SEO pages and other public pages for visual consistency.
 *
 * Differences from the inline landing page Navbar:
 * - Nav links use <Link href="/#section"> instead of scrollTo("#section")
 * - No IntersectionObserver for active section (no sections on SEO pages)
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageNames } from "@/lib/i18n";
import type { Language, Translations } from "@/lib/i18n";
import { useScrollLock } from "@/hooks/ui/useScrollLock";

const LANG_FLAGS: Record<Language, string> = {
  en: "🇺🇸", fr: "🇫🇷", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹",
  pt: "🇵🇹", nl: "🇳🇱", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷",
};
const LANG_SHORT: Record<Language, string> = {
  en: "EN", fr: "FR", es: "ES", de: "DE", it: "IT",
  pt: "PT", nl: "NL", zh: "中文", ja: "日本", ko: "한국",
};

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

function getNavLinks(t: Translations) {
  return [
    {
      label: t.landing.navDemo,
      href: "/#demo",
      description: t.landing.navDemoDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      label: t.landing.navFeatures,
      href: "/#features",
      description: t.landing.navFeaturesDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: t.landing.navTestimonials,
      href: "/#testimonials",
      description: t.landing.navTestimonialsDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: t.landing.navPricing,
      href: "/subscription",
      description: t.landing.navPricingDesc,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
  ];
}

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
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: { duration: 0.2 },
  },
};

export default function LandingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, language, setLanguage } = useLanguage();
  const NAV_LINKS = getNavLinks(t);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useScrollLock(isMenuOpen);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        {/* Mask: solid cover above the floating navbar pill to prevent content bleed */}
        <div
          className={`absolute top-0 left-0 right-0 bg-[#FAFBFC] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isScrolled && !isMenuOpen ? "h-3 opacity-100" : "h-0 opacity-0"
          }`}
          aria-hidden="true"
        />
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
                ? "bg-white/85 backdrop-blur-xl shadow-md shadow-gray-900/[0.05] border border-gray-200/50"
                : "bg-white/60 backdrop-blur-md border border-transparent"
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

                {/* Desktop Nav */}
                <div className={`
                  hidden md:flex items-center gap-0.5 p-1 rounded-2xl transition-all duration-400
                  ${isScrolled ? "bg-gray-100/70" : "bg-transparent"}
                `}>
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="relative px-3.5 py-2 rounded-xl font-medium text-[13px] transition-all duration-300 text-gray-500 hover:text-gray-900 group/navlink"
                    >
                      <span className="absolute inset-0 rounded-xl bg-gray-200/50 opacity-0 group-hover/navlink:opacity-100 transition-opacity duration-200" />
                      <span className="relative z-10">{link.label}</span>
                    </Link>
                  ))}
                </div>

                {/* CTA Desktop */}
                <div className="hidden md:flex items-center gap-2">
                  <div ref={langRef} className="relative">
                    <button
                      onClick={() => setLangOpen(!langOpen)}
                      className="px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5"
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

      {/* Mobile Full-Screen Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            className="md:hidden fixed inset-0 z-[55]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8F5] to-white" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(248,147,93,0.08) 0%, transparent 60%)" }} />

            <div
              className="relative h-full flex flex-col overflow-y-auto overscroll-contain"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
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
                >
                  <HamburgerIcon isOpen={true} />
                </button>
              </div>

              <nav className="px-4 sm:px-6 pt-4" role="navigation">
                <motion.div variants={mobileMenuVariants} initial="hidden" animate="visible" exit="exit" className="space-y-2">
                  {NAV_LINKS.map((link) => (
                    <motion.div key={link.href} variants={mobileItemVariants}>
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors duration-200 group bg-white/50 border border-transparent hover:bg-white hover:shadow-sm active:bg-white"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-[#FEF3EE] text-[#F8935D]/70 group-hover:text-[#F8935D] transition-colors duration-200">
                          {link.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-gray-700 group-hover:text-gray-900">{link.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{link.description}</p>
                        </div>
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </nav>

              <div className="flex-1 min-h-4" />

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }} className="px-4 sm:px-6 pb-4">
                <div className="mb-4">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(Object.keys(languageNames) as Language[]).map((code) => (
                      <button
                        key={code}
                        onClick={() => setLanguage(code)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                          language === code
                            ? "bg-[#F8935D]/10 text-[#F8935D] border border-[#F8935D]/25"
                            : "text-gray-500 bg-white/60 border border-gray-200/60 active:bg-gray-100"
                        }`}
                      >
                        <span className="text-sm">{LANG_FLAGS[code]}</span>
                        <span>{LANG_SHORT[code]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4" />
                <div className="space-y-2.5">
                  <Link
                    href="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-xl font-bold text-white text-[15px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-lg shadow-[#F8935D]/25 active:scale-[0.98] transition-transform duration-150"
                  >
                    {t.landing.navStartFree}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl font-medium text-sm text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 active:scale-[0.98] transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {t.landing.navLogin}
                  </Link>
                </div>
                <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
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
