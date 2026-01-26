"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavbarProps {
  transparent?: boolean;
}

// Premium mobile menu animation variants
const menuVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as [number, number, number, number],
    },
  },
};

const menuItemVariants = {
  closed: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  open: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.05 + i * 0.04,
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const ctaVariants = {
  closed: {
    opacity: 0,
    y: 30,
  },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.35,
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function Navbar({ transparent = false }: NavbarProps) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("hero");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track active section with Intersection Observer
  useEffect(() => {
    const sections = ["hero", "value-proposition", "how-it-works", "social-proof", "use-cases", "features", "pricing"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-80px 0px -50% 0px" }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: sectionId === "hero" ? 0 : offsetPosition,
        behavior: "smooth",
      });
    }
    setMobileMenuOpen(false);
  };

  // Enhanced navigation items with vivid, attractive colors for mobile engagement
  const navItems = [
    {
      id: "hero",
      label: "Accueil",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: "from-orange-500 via-orange-400 to-orange-500",
      iconColor: "text-orange-500",
      glowColor: "rgba(249, 115, 22, 0.5)", // orange vif
    },
    {
      id: "value-proposition",
      label: "Avantages",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: "from-emerald-500 via-green-400 to-emerald-500",
      iconColor: "text-emerald-500",
      glowColor: "rgba(16, 185, 129, 0.5)", // vert doux mais vif
    },
    {
      id: "how-it-works",
      label: "Comment ça marche",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: "from-sky-500 via-cyan-400 to-sky-500",
      iconColor: "text-sky-500",
      glowColor: "rgba(14, 165, 233, 0.5)", // bleu clair vif
    },
    {
      id: "social-proof",
      label: "Témoignages",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "from-rose-500 via-pink-400 to-rose-500",
      iconColor: "text-rose-500",
      glowColor: "rgba(244, 63, 94, 0.5)", // rouge/rose chaud
    },
    {
      id: "use-cases",
      label: "Cas d'usage",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: "from-yellow-500 via-amber-400 to-yellow-500",
      iconColor: "text-yellow-500",
      glowColor: "rgba(234, 179, 8, 0.5)", // jaune lumineux
    },
    {
      id: "features",
      label: "Fonctionnalités",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "from-violet-500 via-purple-400 to-violet-500",
      iconColor: "text-violet-500",
      glowColor: "rgba(139, 92, 246, 0.5)", // violet vif
    },
    {
      id: "pricing",
      label: "Tarifs",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-orange-500 via-orange-400 to-orange-500",
      iconColor: "text-orange-500",
      glowColor: "rgba(249, 115, 22, 0.5)", // orange pour action clé
    },
  ];

  // Consistent button height for perfect alignment
  const buttonHeight = "h-10"; // 40px - touch-friendly and visually balanced

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${
            isScrolled || !transparent
              ? "bg-background/95 backdrop-blur-xl border-b border-dark-border/50 shadow-lg"
              : "bg-background/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none"
          }
        `}
        style={{
          // Safari iOS safe area - critical for notch/Dynamic Island
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 3-column grid layout for perfect balance */}
          {/* Mobile: min-h-[56px] ensures visibility, Desktop: h-20 */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center min-h-[56px] h-16 md:h-20 gap-3 sm:gap-4 lg:gap-8">

            {/* Column 1: Logo - Left aligned */}
            <motion.button
              onClick={() => scrollToSection("hero")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 sm:gap-3 group min-h-[44px]"
              aria-label="Accueil Posty"
            >
              {/* Logo container - larger on mobile for visibility */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-primary/20 group-hover:shadow-xl transition-shadow ring-2 ring-white/10">
                <img
                  src="/logo.jpg"
                  alt="Posty Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Brand name - visible on all screens for recognition */}
              <span className="font-bold text-lg sm:text-xl md:text-2xl leading-none tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                POSTY
              </span>
            </motion.button>

            {/* Column 2: Desktop Navigation - Center aligned */}
            <div className="hidden lg:flex items-center justify-center">
              <nav className="flex items-center gap-1 xl:gap-2" role="navigation">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`
                        relative px-3 xl:px-4 py-2 rounded-lg
                        text-sm font-medium transition-all duration-200
                        ${
                          isActive
                            ? "text-text-primary"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                        }
                      `}
                    >
                      {item.label}
                      {/* Active indicator with vivid color - inside the button for proper containment */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSection"
                          className={`absolute bottom-0.5 left-3 right-3 xl:left-4 xl:right-4 h-0.5 bg-gradient-to-r ${item.color} rounded-full`}
                          style={{
                            boxShadow: `0 0 8px ${item.glowColor}`,
                          }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Column 3: CTA Buttons - Right aligned */}
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              {/* Primary CTA - Desktop only */}
              <motion.button
                onClick={() => scrollToSection("hero")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  hidden md:inline-flex items-center justify-center
                  ${buttonHeight} px-4 lg:px-5
                  bg-gradient-to-r from-primary to-accent text-white
                  text-sm font-semibold rounded-lg
                  shadow-glow hover:shadow-xl transition-all duration-200
                `}
              >
                {t.common.tryNow || "Essayer"}
              </motion.button>

              {/* Login button - Tablet+ */}
              <Link
                href="/login"
                className={`
                  hidden sm:inline-flex items-center justify-center
                  ${buttonHeight} px-4 lg:px-5
                  text-sm font-medium rounded-lg
                  bg-dark-elevated hover:bg-dark-hover
                  border border-dark-border hover:border-primary/30
                  text-text-secondary hover:text-text-primary
                  transition-all duration-200
                `}
              >
                {t.common.login || "Se connecter"}
              </Link>

              {/* Mobile Menu Button - Enhanced with gradient and glow */}
              <div className="relative lg:hidden">
                {/* Animated glow effect */}
                <motion.div
                  animate={{
                    opacity: mobileMenuOpen ? [0.5, 0.8, 0.5] : 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: mobileMenuOpen ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-xl blur-md"
                />

                <motion.button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative inline-flex items-center justify-center
                    w-11 h-11 min-w-[44px] min-h-[44px]
                    bg-dark-elevated/90 backdrop-blur-sm
                    border-2 rounded-xl shadow-lg
                    transition-all duration-200
                    ${mobileMenuOpen
                      ? "border-primary/50 text-primary shadow-primary/20"
                      : "border-dark-border/50 hover:border-primary/30 text-text-primary hover:text-primary"
                    }
                  `}
                  aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  <motion.svg
                    animate={mobileMenuOpen ? "open" : "closed"}
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {/* Top line → transforms to "/" diagonal with gradient */}
                    <motion.path
                      variants={{
                        closed: { d: "M4 6L20 6" },
                        open: { d: "M6 6L18 18" },
                      }}
                      transition={{ duration: 0.2 }}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                    />
                    {/* Middle line → fades out */}
                    <motion.path
                      variants={{
                        closed: { opacity: 1 },
                        open: { opacity: 0 },
                      }}
                      transition={{ duration: 0.15 }}
                      d="M4 12L20 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                    />
                    {/* Bottom line → transforms to "\" diagonal */}
                    <motion.path
                      variants={{
                        closed: { d: "M4 18L20 18" },
                        open: { d: "M6 18L18 6" },
                      }}
                      transition={{ duration: 0.2 }}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                    />
                  </motion.svg>

                  {/* Dot indicator for visual interest */}
                  {!mobileMenuOpen && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gradient-to-br from-accent to-primary rounded-full shadow-lg shadow-accent/50"
                    />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Full-Screen Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 lg:hidden"
            style={{
              // Ensure menu covers safe area on Safari iOS
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            {/* Layered background for depth */}
            <div className="absolute inset-0 bg-background backdrop-blur-xl" />

            {/* Subtle gradient overlay */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: "radial-gradient(ellipse at top right, rgba(248, 163, 93, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(248, 87, 81, 0.1) 0%, transparent 50%)"
              }}
            />

            {/* Brand watermark - subtle logo in background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-[0.02] pointer-events-none">
              <img
                src="/logo.jpg"
                alt=""
                className="w-full h-full object-contain blur-sm"
              />
            </div>

            {/* Menu content container */}
            <div
              className="relative h-full flex flex-col"
              style={{
                // Account for navbar height (56px on mobile) + safe area
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 72px)",
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)"
              }}
            >
              {/* Navigation section - centered with generous spacing */}
              <nav
                className="flex-1 flex flex-col justify-center px-6 sm:px-8"
                role="navigation"
              >
                <div className="space-y-1">
                  {navItems.map((item, index) => {
                    const isActive = activeSection === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        custom={index}
                        variants={menuItemVariants}
                        initial="closed"
                        animate="open"
                        onClick={() => scrollToSection(item.id)}
                        className="group w-full text-left py-3.5 sm:py-4 relative overflow-hidden rounded-xl"
                      >
                        {/* Enhanced glow effect for active item */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 rounded-xl blur-xl pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at center, ${item.glowColor} 0%, transparent 70%)`,
                            }}
                          />
                        )}

                        {/* Active background gradient */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-10 rounded-xl`}
                          />
                        )}

                        {/* Active indicator line */}
                        <motion.div
                          className={`
                            absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full
                            transition-all duration-300
                            ${isActive
                              ? `h-10 bg-gradient-to-b ${item.color} opacity-100 shadow-lg`
                              : "h-0 bg-primary opacity-0"
                            }
                          `}
                          style={isActive ? {
                            boxShadow: `0 0 12px ${item.glowColor}`
                          } : undefined}
                        />

                        {/* Menu item content */}
                        <div className={`
                          relative flex items-center gap-4
                          transition-all duration-200
                          ${isActive ? "pl-6" : "pl-2 group-active:pl-4"}
                        `}>
                          {/* Colorful icon with glow */}
                          <motion.div
                            className={`
                              flex-shrink-0 transition-all duration-200
                              ${isActive ? item.iconColor : "text-text-muted group-active:text-text-primary"}
                            `}
                            animate={isActive ? {
                              scale: [1, 1.1, 1],
                            } : {
                              scale: 1,
                            }}
                            transition={{
                              duration: 2,
                              repeat: isActive ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                            style={isActive ? {
                              filter: `drop-shadow(0 0 8px ${item.glowColor})`
                            } : undefined}
                          >
                            {item.icon}
                          </motion.div>

                          {/* Label with gradient on active */}
                          <span className={`
                            text-xl sm:text-2xl font-medium flex-1
                            transition-all duration-200
                            ${isActive
                              ? "text-text-primary font-semibold"
                              : "text-text-secondary group-active:text-text-primary"
                            }
                          `}>
                            {item.label}
                          </span>

                          {/* Enhanced arrow indicator with gradient */}
                          <motion.div
                            className={`
                              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                              transition-all duration-200
                              ${isActive
                                ? `bg-gradient-to-r ${item.color} shadow-lg`
                                : "bg-transparent"
                              }
                            `}
                            style={isActive ? {
                              boxShadow: `0 4px 12px ${item.glowColor}`
                            } : undefined}
                            animate={isActive ? {
                              x: [0, 4, 0],
                            } : {
                              x: 0,
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: isActive ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                          >
                            <svg
                              className={`
                                w-5 h-5 transition-all duration-200
                                ${isActive
                                  ? "text-white opacity-100"
                                  : "text-text-muted opacity-0"
                                }
                              `}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </motion.div>
                        </div>

                        {/* Enhanced tap highlight effect with color */}
                        <div
                          className={`
                            absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-150 rounded-xl
                            bg-gradient-to-r ${item.color}
                          `}
                          style={{ opacity: 0.05 }}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </nav>

              {/* CTA section - fixed at bottom with premium styling */}
              <motion.div
                variants={ctaVariants}
                initial="closed"
                animate="open"
                className="px-6 sm:px-8 pb-4"
              >
                {/* Subtle separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-dark-border to-transparent mb-6" />

                {/* CTA buttons container */}
                <div className="space-y-3">
                  {/* Primary CTA - Enhanced gradient with animated glow */}
                  <div className="relative group">
                    {/* Animated glow background */}
                    <motion.div
                      animate={{
                        opacity: [0.6, 1, 0.6],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur-lg opacity-75"
                    />

                    <motion.button
                      onClick={() => scrollToSection("hero")}
                      whileTap={{ scale: 0.98 }}
                      className="
                        relative w-full h-14 px-6 overflow-hidden
                        bg-gradient-to-r from-primary via-accent to-primary
                        hover:from-primary hover:via-primary hover:to-accent
                        text-white font-bold text-base
                        rounded-2xl shadow-2xl
                        transition-all duration-300
                      "
                    >
                      {/* Enhanced shimmer effect */}
                      <motion.div
                        animate={{
                          x: ["-100%", "200%"]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          repeatDelay: 1
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />

                      {/* Sparkle effect */}
                      <div className="absolute inset-0">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.7,
                              ease: "easeInOut"
                            }}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{
                              left: `${20 + i * 30}%`,
                              top: `${30 + i * 20}%`
                            }}
                          />
                        ))}
                      </div>

                      <span className="relative flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          ✨
                        </motion.span>
                        {t.common.tryNow || "Commencer gratuitement"}
                        <motion.svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </motion.svg>
                      </span>
                    </motion.button>
                  </div>

                  {/* Secondary CTA - Login with hover effect */}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="
                      group relative flex items-center justify-center gap-2
                      w-full h-12 px-6 overflow-hidden
                      text-text-secondary font-medium text-sm
                      bg-white/5 hover:bg-white/10
                      border border-dark-border/50 hover:border-primary/40
                      rounded-xl
                      transition-all duration-200
                      active:scale-[0.98]
                    "
                  >
                    {/* Gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <svg className="w-4 h-4 relative z-10 group-hover:text-primary transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="relative z-10 group-hover:text-text-primary transition-colors duration-200">
                      {t.common.login || "Se connecter"}
                    </span>
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="mt-5 flex items-center justify-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Sans carte bancaire
                  </span>
                  <span className="w-1 h-1 rounded-full bg-text-muted/50" />
                  <span>100% gratuit</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
