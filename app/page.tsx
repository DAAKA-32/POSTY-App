"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getAllPlans, PlanConfig, PLAN_TAGLINES, getPlanCoreFeatures, getPlanSecondaryFeatures, getCTALabel, getSavingsText, FeatureItem } from "@/lib/plans";

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
    description: "Testez l'IA en direct",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: "Caracteristiques",
    href: "#features",
    description: "Fonctionnalites cles",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "Temoignages",
    href: "#testimonials",
    description: "Avis de nos utilisateurs",
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const scrollTo = (href: string) => {
    setIsMenuOpen(false);
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled || isMenuOpen
          ? "bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-sm shadow-gray-200/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 relative z-[60]">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-md shadow-[#F8935D]/15 ring-1 ring-gray-100"
            >
              <Image src="/logo-avec fond.jpg" alt="Posty" width={40} height={40} className="w-full h-full object-cover" />
            </motion.div>
            <span className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Posty</span>
          </Link>

          {/* Desktop Nav — pill bg on hover + active indicator */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-gray-100/0 transition-colors duration-300"
            style={isScrolled ? { backgroundColor: "rgba(243,244,246,0.6)" } : {}}
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className={`
                    relative px-4 py-2 rounded-xl font-medium text-[14px] transition-all duration-300 group/navlink
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
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              Se connecter
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup"
                className="shimmer-cta inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-white text-[14px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-lg shadow-[#F8935D]/20 hover:shadow-xl hover:shadow-[#F8935D]/30 transition-all duration-300 group"
              >
                <span className="relative z-10">Commencer</span>
                <svg className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
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

      {/* ============================================= */}
      {/* Mobile Full-Screen Drawer                     */}
      {/* ============================================= */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed top-16 inset-x-0 bottom-0 bg-white z-50 flex flex-col overflow-hidden"
          >
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col px-5 pt-6 pb-8 overflow-y-auto"
            >
              {/* Navigation Links */}
              <div className="space-y-1">
                {NAV_LINKS.map((link) => {
                  const isActive = activeSection === link.href;
                  return (
                    <motion.button
                      key={link.href}
                      variants={mobileItemVariants}
                      onClick={() => scrollTo(link.href)}
                      className={`
                        w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left
                        transition-all duration-200 group
                        ${isActive
                          ? "bg-[#F8935D]/5 border border-[#F8935D]/15"
                          : "hover:bg-gray-50 active:bg-gray-100 border border-transparent"
                        }
                      `}
                    >
                      {/* Icon container */}
                      <div className={`
                        flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                        transition-all duration-200 border
                        ${isActive
                          ? "bg-[#F8935D]/10 border-[#F8935D]/20 text-[#F8935D]"
                          : "bg-gray-50 border-gray-100 text-gray-500 group-active:bg-[#F8935D]/10 group-active:border-[#F8935D]/20 group-active:text-[#F8935D]"
                        }
                      `}>
                        {link.icon}
                      </div>
                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold ${isActive ? "text-[#F76B54]" : "text-gray-900"}`}>
                          {link.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {link.description}
                        </p>
                      </div>
                      {/* Arrow */}
                      <svg className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${isActive ? "text-[#F8935D]" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  );
                })}
              </div>

              {/* Divider */}
              <motion.div
                variants={mobileItemVariants}
                className="my-6 border-t border-gray-100"
              />

              {/* Secondary link: Connexion */}
              <motion.div variants={mobileItemVariants}>
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-600 hover:text-gray-900 active:bg-gray-50 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-[15px] font-medium">Se connecter</span>
                </Link>
              </motion.div>

              {/* Spacer */}
              <div className="flex-1 min-h-6" />

              {/* CTA Button */}
              <motion.div variants={mobileItemVariants} className="mt-auto">
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="shimmer-cta flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-white text-base bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-lg shadow-[#F8935D]/25 active:scale-[0.98] transition-all duration-300"
                >
                  Demarrer gratuitement
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// =============================================================================
// DEMO SECTION - Two-Stage Immersive Chat Experience
// =============================================================================
// Stage 1: Landing page block — input + suggestions only (no AI response)
// Stage 2: Full-screen overlay — real conversation with AI streaming
// State preserved across navigation (localStorage + React state)
// =============================================================================

const ALL_DEMO_SUGGESTIONS = [
  { label: "Strategie d'entreprise", emoji: "🎯", text: "Ecris un post LinkedIn sur la strategie d'entreprise et la vision a long terme" },
  { label: "Networking professionnel", emoji: "🤝", text: "Ecris un post engageant sur l'importance du networking professionnel" },
  { label: "Leadership en entreprise", emoji: "👤", text: "Ecris un post LinkedIn sur le leadership authentique en entreprise" },
  { label: "Visibilite LinkedIn", emoji: "📈", text: "Ecris un post LinkedIn sur l'optimisation de sa visibilite sur LinkedIn" },
  { label: "Generation de prospects", emoji: "💼", text: "Ecris un post LinkedIn sur la generation de prospects efficace" },
  { label: "Posts engageants", emoji: "✍️", text: "Ecris un post LinkedIn sur comment creer des posts engageants qui convertissent" },
  { label: "Croissance professionnelle", emoji: "🚀", text: "Ecris un post LinkedIn sur la croissance professionnelle et personnelle" },
];

function DemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fullScreenChatRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();

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

  // Body scroll lock when full-screen is open
  useEffect(() => {
    if (showFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showFullScreen]);

  // Auto-scroll in full-screen chat as response streams
  useEffect(() => {
    if ((isStreaming || aiResponse) && showFullScreen) {
      fullScreenChatRef.current?.scrollTo({
        top: fullScreenChatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [aiResponse, isStreaming, showFullScreen]);

  // Reveal card after entrance animation
  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => setShowCard(true), prefersReducedMotion ? 0 : 1400);
    return () => clearTimeout(t);
  }, [isInView, prefersReducedMotion]);

  // Easing tokens
  const premiumEase = [0.22, 1, 0.36, 1] as [number, number, number, number];
  const settleEase = [0.4, 0, 0.2, 1] as [number, number, number, number];

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
        throw new Error(errData.message || "Erreur lors de la generation");
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

  return (
    <>
      {/* ================================================================== */}
      {/* STAGE 1: Landing Page Demo Block                                   */}
      {/* ================================================================== */}
      <section
        ref={sectionRef}
        id="demo"
        className="relative pt-28 pb-16 md:pt-32 md:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAE8DE]/50 via-[#FFF8F5] to-[#FAE8DE]/50 overflow-hidden"
      >
        {/* Decorative ambient glows — animated */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: [0, 0.06, 0.09, 0.06] } : {}}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#F8935D] rounded-full blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: [0, 0.04, 0.07, 0.04] } : {}}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-1/3 left-1/3 w-[500px] h-[400px] bg-[#F76B54] rounded-full blur-[100px]"
          />
        </div>

        <div className="max-w-6xl mx-auto relative">

          {/* Reveal tagline — progressively revealed as demo card descends */}
          <div className="text-center mb-8 md:mb-10 relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3 }
                  : { duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }
              }
              className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-gray-900 leading-tight"
            >
              Voici votre outil qui transforme vos posts en{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                machine a clients
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3, delay: 0.1 }
                  : { duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }
              }
              className="mt-3 text-gray-500 text-base md:text-lg max-w-xl mx-auto"
            >
              Testez Posty en direct — generez votre premier post LinkedIn en quelques secondes.
            </motion.p>
          </div>

          {/* Demo card — 2-act cinematic entrance                         */}
          {/* ACT 1 (0→0.38s): Fast slide from left, deblur, arrive elevated  */}
          {/* ACT 2 (0.38→1.35s): Dramatic descent to final position          */}
          {/* Text is progressively revealed as card descends                 */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }
                : { opacity: 0, x: "-55%", y: -140, scale: 0.9, rotate: -2, filter: "blur(10px)" }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }
                : isInView
                  ? {
                      opacity: [0, 0.9, 1, 1, 1],
                      x: ["-55%", "-2%", "0%", "0%", "0%"],
                      y: [-140, -140, -130, -20, 0],
                      scale: [0.9, 1.02, 1.0, 1.0, 1.0],
                      rotate: [-2, 0, 0, 0, 0],
                      filter: ["blur(10px)", "blur(1px)", "blur(0px)", "blur(0px)", "blur(0px)"],
                    }
                  : {}
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : {
                    duration: 1.35,
                    times: [0, 0.28, 0.38, 0.72, 1],
                    ease: ["easeOut", "easeOut", [0.22, 1, 0.36, 1], [0.22, 1, 0.36, 1]],
                  }
            }
            className="relative z-20"
          >
            {/* Layered glow behind the card — builds as card arrives at center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: [0, 0.5, 1], scale: [0.8, 0.9, 1] } : {}}
              transition={{ duration: 1.0, delay: 0.25, times: [0, 0.4, 1], ease: "easeOut" }}
              className="absolute -inset-4 md:-inset-6 rounded-[2rem] bg-gradient-to-br from-[#F8935D]/12 via-[#F76B54]/8 to-[#FBB9AD]/5 blur-3xl pointer-events-none"
            />
            {/* Secondary warm ring glow — fades in during descent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: [0, 0, 0.5, 0.3] } : {}}
              transition={{ duration: 2.0, times: [0, 0.3, 0.6, 1], ease: "easeInOut" }}
              className="absolute -inset-8 md:-inset-12 rounded-[2.5rem] bg-gradient-to-r from-[#F8935D]/[0.06] via-[#F76B54]/[0.04] to-[#F8935D]/[0.06] blur-[60px] pointer-events-none"
            />

            {/* Main demo card */}
            <div className="relative bg-white border border-gray-200/60 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-gray-400/20">

              {/* MacBook-style title bar */}
              <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-100">
                    <Image src="/logo.jpg" alt="Posty" width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm md:text-base">Posty</p>
                    <p className="text-[11px] md:text-xs text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      IA disponible
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

              {/* Chat area — input only, never shows AI response */}
              <div className="relative p-5 md:p-8 bg-gradient-to-b from-gray-50/80 to-gray-50/40 min-h-[400px] md:min-h-[520px] flex flex-col">

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
                    <p className="text-gray-900 font-semibold text-base mb-1">Vous avez deja teste la demo</p>
                    <p className="text-gray-500 text-sm mb-5 max-w-xs">
                      Creez un compte gratuit pour generer des posts LinkedIn illimites avec Posty
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
                          Voir ma reponse
                        </button>
                      )}
                      <Link
                        href="/signup"
                        className="shimmer-cta inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35 transition-all duration-300"
                      >
                        <span className="relative z-10">Creer mon compte gratuit</span>
                        <svg className="relative z-10 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* Initial state — centered logo + numbered suggestions + input */}
                {!demoUsed && showCard && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Centered content: logo + text + numbered suggestions */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {/* Posty logo */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: premiumEase }}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg shadow-[#F8935D]/15 ring-1 ring-gray-100 mb-5"
                      >
                        <Image src="/logo.jpg" alt="Posty" width={64} height={64} className="w-full h-full object-cover" />
                      </motion.div>

                      {/* Instructional text */}
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2, ease: premiumEase }}
                        className="text-gray-500 text-sm md:text-base mb-6 md:mb-8"
                      >
                        Demander quelque chose a Posty
                      </motion.p>

                      {/* Three numbered suggestions — stacked vertically */}
                      <div className="w-full max-w-sm space-y-2.5">
                        {suggestions.map((suggestion, i) => (
                          <motion.button
                            key={suggestion.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.25 + i * 0.1, ease: premiumEase }}
                            onClick={() => handleSend(suggestion.text)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center gap-3.5 px-4 py-3 md:px-5 md:py-3.5 bg-white border border-gray-200 rounded-xl text-left text-sm md:text-[15px] text-gray-700 hover:border-[#F8935D]/50 hover:bg-[#F8935D]/5 hover:text-gray-900 transition-all duration-[250ms] shadow-sm hover:shadow-md hover:shadow-[#F8935D]/10"
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
                    <form onSubmit={handleSubmit} className="relative mt-6">
                      <div className="relative rounded-[20px] border border-gray-200 bg-white shadow-sm focus-within:border-[#F8935D]/50 focus-within:ring-2 focus-within:ring-[#F8935D]/20 transition-all duration-200">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Ecrivez votre propre sujet..."
                          className="w-full text-sm md:text-[15px] text-gray-900 placeholder-gray-400 bg-transparent py-3.5 md:py-4 pl-5 pr-28 rounded-[20px] focus:outline-none"
                          disabled={isStreaming}
                        />
                        {/* Action buttons — right side */}
                        <div className="absolute flex items-center right-2.5 top-1/2 -translate-y-1/2 gap-2">
                          {/* Microphone button (decorative) */}
                          <button
                            type="button"
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 transition-colors duration-200 hover:bg-gray-200 hover:text-gray-500"
                            aria-label="Enregistrement vocal"
                            tabIndex={-1}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </button>
                          {/* Send button */}
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
          </motion.div>
        </div>
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
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
                  <Image src="/logo.jpg" alt="Posty" width={36} height={36} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-sm">Posty</p>
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {isStreaming ? "Ecrit..." : "IA disponible"}
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
                  <div
                    className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F8935D]/20 mt-0.5"
                    style={{ background: colors.gradient }}
                  >
                    <span className="text-white font-bold text-xs">P</span>
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
                            Envie de generer plus de posts LinkedIn ?
                          </p>
                          <Link
                            href="/signup"
                            className="shimmer-cta inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35 transition-all duration-300"
                          >
                            <span className="relative z-10">Creer mon compte gratuit</span>
                            <svg className="relative z-10 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  image: string;
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
  };
  badge: string;
  metric: string;
}

const FEATURES: FeatureConfig[] = [
  {
    title: "Creez des posts automatiques en 3 clics",
    description: "Decrivez simplement votre idee et l'IA genere deux versions optimisees pour LinkedIn. Storytelling ou Business, a vous de choisir.",
    image: "/analytics.jpg",
    badge: "Automatisation",
    metric: "10x plus rapide",
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
    },
  },
  {
    title: "Une IA qui adapte les posts a votre profil",
    description: "Notre IA apprend votre ton, votre style et votre secteur pour creer du contenu authentique qui vous ressemble vraiment.",
    image: "/img-ia.jpg",
    badge: "IA Personnalisee",
    metric: "100% unique",
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
    },
  },
  {
    title: "Programmation intelligente des posts",
    description: "Planifiez vos publications aux meilleurs moments pour maximiser votre visibilite et votre engagement.",
    image: "/professionel.jpg",
    badge: "Planification",
    metric: "+40% engagement",
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
    },
  },
  {
    title: "Creation de contenu en modalite vocale",
    description: "Dictez vos idees a voix haute et transformez-les instantanement en posts professionnels prets a publier.",
    image: "/vocal.jpg",
    badge: "Voice-to-Post",
    metric: "En 30 secondes",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    color: {
      primary: "rose",
      bg: "from-rose-50 via-white to-orange-50/50",
      border: "border-rose-200 hover:border-rose-400",
      iconBg: "bg-gradient-to-br from-[#F8935D] to-[#F76B54]",
      iconText: "text-white",
      badge: "bg-rose-100",
      badgeText: "text-rose-700",
      glow: "shadow-rose-500/20",
      accent: "text-[#F76B54]",
    },
  },
];

function FeatureCard({ feature, index }: { feature: FeatureConfig; index: number }) {
  const isEven = index % 2 === 0;
  const stepNumber = index + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
      className={`
        relative bg-gradient-to-br ${feature.color.bg}
        border ${feature.color.border} rounded-2xl lg:rounded-3xl
        p-5 md:p-8 lg:p-10
        shadow-sm hover:shadow-xl ${feature.color.glow}
        transition-all duration-[400ms]
        group/card
      `}
    >
      {/* Inner flex layout: image + content */}
      <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 lg:gap-10 items-center`}>

        {/* Image Card */}
        <div className="w-full lg:w-1/2 flex-shrink-0">
          <div className={`
            relative rounded-xl lg:rounded-2xl overflow-hidden
            shadow-md transition-all duration-[400ms]
            group-hover/card:shadow-lg
            group/img
          `}>
            {/* Image */}
            <Image
              src={feature.image}
              alt={feature.title}
              width={500}
              height={320}
              className="w-full h-auto object-cover aspect-[16/10]"
            />

            {/* Badge overlay — top left */}
            <div className="absolute top-3 left-3 z-20">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  ${feature.color.badge} ${feature.color.badgeText}
                  text-xs font-semibold backdrop-blur-sm shadow-lg
                `}
              >
                <span className={`w-2 h-2 rounded-full ${feature.color.iconBg} animate-pulse`} />
                {feature.badge}
              </motion.span>
            </div>

            {/* Numbered step badge — bottom left */}
            <div className="absolute bottom-3 left-3 z-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 + index * 0.1, type: "spring", stiffness: 300 }}
                className={`
                  w-9 h-9 rounded-xl ${feature.color.iconBg}
                  flex items-center justify-center
                  shadow-lg text-white font-bold text-sm
                  ring-2 ring-white/80
                `}
              >
                {stepNumber}
              </motion.div>
            </div>

            {/* Metric badge — bottom right */}
            <div className="absolute bottom-3 right-3 z-20">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`
                  inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                  bg-white/95 backdrop-blur-sm shadow-lg
                  text-xs font-bold ${feature.color.accent}
                `}
              >
                {feature.metric}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Content Side */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          {/* Icon with hover animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
            className={`
              inline-flex items-center justify-center w-14 h-14 rounded-2xl
              ${feature.color.iconBg} ${feature.color.iconText}
              shadow-lg ${feature.color.glow}
              mb-5
            `}
          >
            {feature.icon}
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 + index * 0.1 }}
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight"
          >
            {feature.title}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="text-gray-600 text-lg leading-relaxed mb-6"
          >
            {feature.description}
          </motion.p>

          {/* CTA Link with arrow slide on hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 + index * 0.1 }}
          >
            <Link
              href="/signup"
              className={`
                inline-flex items-center gap-2 font-semibold
                ${feature.color.accent}
                transition-all duration-300
                group/link relative
              `}
            >
              <span className="relative">
                En savoir plus
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
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FEF3EE] via-[#FAE8DE]/30 to-[#FEF3EE] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="text-center mb-20"
        >
          {/* Premium badge */}
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
            <span className="text-sm font-medium text-gray-700">Fonctionnalites puissantes</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
            Tout ce qu&apos;il vous faut pour{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              dominer LinkedIn
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Des outils puissants et intuitifs pour transformer vos idees en posts qui convertissent
          </p>
        </motion.div>

        {/* Features Grid with Connectors */}
        <div className="relative space-y-16 md:space-y-24">
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
              {/* Connector dot on the timeline — desktop only */}
              {index < FEATURES.length && (
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className={`w-5 h-5 rounded-full ${feature.color.iconBg} ring-[5px] ring-white shadow-lg`}
                  />
                </div>
              )}

              {/* Mobile step connector — vertical line + dot */}
              {index > 0 && (
                <div className="lg:hidden flex flex-col items-center -mt-4 mb-8">
                  <div className="w-0.5 h-12 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full" />
                  <div className={`w-3 h-3 rounded-full ${feature.color.iconBg} ring-3 ring-white shadow-md mt-0.5`} />
                </div>
              )}

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
    name: "Alexandre Moreau",
    role: "Fondateur & CEO",
    company: "GrowthLab",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    quote: "Posty a revolutionne ma strategie LinkedIn. En 3 mois, j'ai triple mon engagement et signe 12 nouveaux clients B2B.",
  },
  {
    name: "Sophie Laurent",
    role: "Directrice Marketing",
    company: "TechVision",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    quote: "L'IA capture parfaitement notre ton de marque. Mes equipes gagnent 10 heures par semaine sur la creation de contenu.",
  },
  {
    name: "Marc Dubois",
    role: "Consultant Senior",
    company: "Independant",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    quote: "En freelance, chaque minute compte. Posty me permet de publier du contenu de qualite sans sacrifier mes missions clients.",
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAE8DE]/50 to-[#FEF3EE] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="text-center mb-16"
        >
          {/* Trust Badge */}
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
                  <Image src={t.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600 font-medium">+500 professionnels satisfaits</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Ils ont transforme leur{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              presence LinkedIn
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Decouvrez les resultats concrets obtenus par nos utilisateurs
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6, ease: smoothEase }}
              className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#F8935D]/30 transition-all duration-[400ms] shadow-lg shadow-gray-100/60"
            >
              {/* Animated accent line at top */}
              <div className="h-[3px] bg-gradient-to-r from-[#F8935D] to-[#F76B54] w-0 group-hover:w-full transition-all duration-500 ease-out" />

              <div className="p-8">
                {/* Quote */}
                <blockquote className="text-gray-700 text-[15px] leading-relaxed mb-8 min-h-[80px]">
                  &laquo; {testimonial.quote} &raquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-100 group-hover:ring-[#F8935D]/30 transition-all duration-300 flex-shrink-0">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold truncate">{testimonial.name}</p>
                    <p className="text-gray-500 text-sm truncate">{testimonial.role}</p>
                    <p className="text-[#F8935D] text-xs font-medium truncate">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

// =============================================================================
// FOUNDER MESSAGE SECTION - Typography-First Emotional Design
// =============================================================================
function FounderSection() {
  return (
    <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Distinctive warm background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FDF8F4] via-[#FFF9F5] to-[#FEF0E8]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #F8935D 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="relative max-w-5xl mx-auto">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="text-center mb-10 md:mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Les mots de nos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              fondateurs
            </span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto">
            La vision derriere Posty
          </p>
        </motion.div>

        {/* Quote Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 mb-10 md:mb-14">

          {/* CEO Quote Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: smoothEase }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#F8935D]/15 shadow-sm hover:shadow-lg hover:shadow-[#F8935D]/8 transition-all duration-300 group/card"
          >
            {/* Quotation mark + accent line */}
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-[#F8935D]/30 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179z" />
              </svg>
              <div className="w-8 h-[2px] bg-gradient-to-r from-[#F8935D] to-transparent rounded-full" />
            </div>

            {/* Quote text */}
            <blockquote className="mb-5">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed italic">
                J&apos;ai cree Posty pour aider des milliers d&apos;entrepreneurs a{" "}
                <span className="font-semibold not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                  developper leurs prospects
                </span>
                , accroitre leur{" "}
                <span className="font-semibold not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#F76B54] to-[#E85D45]">
                  visibilite
                </span>
                {" "}et faire reellement croitre leurs{" "}
                <span className="font-semibold not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                  finances
                </span>
                {" "}grace a LinkedIn.
              </p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#F8935D]/10">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden ring-2 ring-[#F8935D]/20 flex-shrink-0">
                <Image
                  src="/ceo.png"
                  alt="Emilien Nepveu"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm md:text-base font-semibold text-gray-900">
                  Emilien Nepveu
                </p>
                <p className="text-xs md:text-sm text-[#F8935D] font-medium">
                  Founder & CEO
                </p>
              </div>
            </div>
          </motion.div>

          {/* CMO Quote Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: smoothEase, delay: 0.15 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#F76B54]/15 shadow-sm hover:shadow-lg hover:shadow-[#F76B54]/8 transition-all duration-300 group/card"
          >
            {/* Quotation mark + accent line */}
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-[#F76B54]/30 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.234 0-2.385-.597-2.917-1.179z" />
              </svg>
              <div className="w-8 h-[2px] bg-gradient-to-r from-[#F76B54] to-transparent rounded-full" />
            </div>

            {/* Quote text */}
            <blockquote className="mb-5">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed italic">
                Posty aide les entrepreneurs a transformer leur contenu en{" "}
                <span className="font-semibold not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#F76B54] to-[#E85D45]">
                  opportunites concretes
                </span>
                {" "}et mesurables.
              </p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#F76B54]/10">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden ring-2 ring-[#F76B54]/15 flex-shrink-0">
                <Image
                  src="/cmo.jpg"
                  alt="CMO - Posty"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm md:text-base font-semibold text-gray-900">
                  CMO
                </p>
                <p className="text-xs md:text-sm text-[#F76B54] font-medium">
                  Chief Marketing Officer
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: smoothEase, delay: 0.25 }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/signup"
              className="shimmer-cta relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35 transition-all duration-300 overflow-hidden group"
            >
              <span className="relative z-10">Rejoindre Posty</span>
              <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
// PRICING SECTION - Replicated from Subscription Page
// =============================================================================
const PLANS = getAllPlans();

// Feature item component for pricing cards
function FeatureListItem({ feature, index }: { feature: FeatureItem; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.05 }}
      className="flex items-start gap-2 md:gap-3"
    >
      <div className={`
        flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5
        ${feature.included
          ? "bg-green-500/20 text-green-600"
          : "bg-red-500/15 text-red-500"
        }
      `}>
        {feature.included ? (
          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className={`text-xs md:text-sm ${
        feature.included
          ? "text-gray-600"
          : "text-gray-400 line-through"
      }`}>
        {feature.text}
      </span>
    </motion.li>
  );
}

// Pricing Card Component - matches subscription page
interface PricingCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  yearlySavings: number;
  yearlyMonthlyPrice: number;
  index: number;
  isFeaturesExpanded: boolean;
  onToggleFeatures: () => void;
}

function PricingCard({
  plan,
  billingPeriod,
  yearlySavings,
  yearlyMonthlyPrice,
  index,
  isFeaturesExpanded,
  onToggleFeatures,
}: PricingCardProps) {
  const displayPrice = billingPeriod === "monthly" ? plan.price.monthly : yearlyMonthlyPrice;
  const isPopular = plan.highlight;
  const isPremium = plan.premium;
  const isFree = plan.price.monthly === 0;
  const coreFeatures = getPlanCoreFeatures(plan);
  const secondaryFeatures = getPlanSecondaryFeatures(plan);
  const planInfo = PLAN_TAGLINES[plan.id] || { tagline: plan.description, idealFor: "" };
  const [isHovered, setIsHovered] = useState(false);

  const showMoreFeatures = isFeaturesExpanded;
  const includedSecondaryCount = secondaryFeatures.filter(f => f.included).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.15,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={!isPopular ? { y: -6, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } : undefined}
      className={`
        relative rounded-2xl overflow-hidden h-full
        ${isPopular ? "scale-100 md:scale-105 z-20 ring-2 ring-[#F8935D]/70" : "z-10"}
      `}
    >
      {/* Enhanced glow effect for popular plan */}
      {isPopular && (
        <>
          {/* Outer pulsing glow */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] opacity-60 blur-xl animate-pulse" />
          {/* Inner animated gradient border */}
          <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-br from-[#F8935D] via-[#F76B54] to-[#F8935D] bg-[length:200%_200%] animate-gradient-slow">
            <div className="absolute inset-[2px] rounded-[14px] bg-white" />
          </div>
        </>
      )}

      {/* Premium glow effect */}
      {isPremium && (
        <>
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-25 blur-lg" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/15 via-transparent to-orange-500/15 opacity-80" />
        </>
      )}

      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F8935D]/[0.05] to-transparent animate-shimmer" />
      </motion.div>

      {/* Card background */}
      <div className={`
        relative p-4 md:p-6 lg:p-8 rounded-2xl h-full flex flex-col
        ${isPopular
          ? "bg-gradient-to-b from-[#F8935D]/10 via-white to-white"
          : isPremium
            ? "bg-gradient-to-b from-amber-500/5 via-white to-white border-2 border-amber-500/30"
            : isFree
              ? "bg-white border border-[#F8935D]/25"
              : "bg-white border border-gray-200"
        }
      `}>
        {/* ZONE 0: Badges */}
        <div className="h-[36px] md:h-[44px] flex items-start justify-center relative mb-2">
          {isPopular && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#F8935D] rounded-full blur-md opacity-50 animate-pulse" />
              <div className="relative px-3 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-xs md:text-sm font-semibold rounded-full shadow-lg shadow-[#F8935D]/30 flex items-center gap-1.5">
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Le plus populaire
              </div>
            </motion.div>
          )}

          {isPremium && !isPopular && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="px-3 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs md:text-sm font-semibold rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
                Elite
              </div>
            </motion.div>
          )}
        </div>

        {/* ZONE 1: Plan header */}
        <div className="h-[70px] md:h-[80px] text-center flex flex-col justify-center">
          <h3 className={`text-lg md:text-2xl font-bold mb-1 ${
            isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
          }`}>
            {plan.name}
          </h3>
          <p className="text-xs md:text-sm text-gray-500 line-clamp-2">{planInfo.tagline}</p>
          <p className={`text-[10px] md:text-xs mt-1 ${isPopular ? "text-[#F8935D]" : isPremium ? "text-amber-500" : "text-gray-400"}`}>
            {planInfo.idealFor}
          </p>
        </div>

        {/* ZONE 2: Price section */}
        <div className="h-[100px] md:h-[130px] text-center flex flex-col justify-center">
          {/* Price display */}
          <div className="h-[42px] md:h-[56px] flex items-center justify-center">
            <motion.div
              key={`${plan.id}-${billingPeriod}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-baseline justify-center gap-1"
            >
              {isFree ? (
                <span className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900">Gratuit</span>
              ) : (
                <>
                  <span className={`text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums ${
                    isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
                  }`}>
                    {displayPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-base md:text-xl text-gray-900 font-medium">€</span>
                  <span className="text-gray-500 text-xs md:text-sm">/mois</span>
                </>
              )}
            </motion.div>
          </div>

          {/* Savings badge */}
          <div className={`h-[42px] md:h-[56px] flex flex-col items-center justify-center transition-opacity duration-200 ${
            billingPeriod === "yearly" && !isFree ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
            <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs md:text-sm text-green-600 font-semibold">
                {getSavingsText(plan.id) || `${yearlySavings.toFixed(0)}€ economises`}
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 mt-1">
              Facture {plan.price.yearly}€/an
            </p>
          </div>
        </div>

        {/* ZONE 3: CTA Button */}
        <div className="h-[42px] md:h-[56px] relative flex items-center mb-4 md:mb-6">
          {/* Glow effect behind button for popular plan */}
          {isPopular && (
            <div className="absolute inset-0 bg-[#F8935D]/30 rounded-xl blur-xl" />
          )}
          {isPremium && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-xl" />
          )}

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full h-full"
          >
            <Link
              href="/signup"
              className={`
                relative w-full h-full flex items-center justify-center px-4 rounded-xl font-semibold text-xs md:text-sm
                transition-all duration-300 overflow-hidden
                ${(isPopular || isPremium) ? "shimmer-cta" : ""}
                ${isPopular
                  ? "bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white shadow-lg shadow-[#F8935D]/30 hover:shadow-xl hover:shadow-[#F8935D]/40"
                  : isPremium
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40"
                    : "bg-gray-100 hover:bg-[#F8935D]/10 text-gray-900 border border-gray-200 hover:border-[#F8935D]/40 hover:text-[#F76B54]"
                }
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {getCTALabel(plan.id, billingPeriod === "yearly")}
                <svg className="w-3 h-3 md:w-4 md:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </motion.div>
        </div>

        {/* ZONE 4: Features list */}
        <div className="flex-1 pt-4 border-t border-gray-200">
          <ul className="space-y-2 md:space-y-2.5">
            {coreFeatures.map((feature, idx) => (
              <FeatureListItem key={idx} feature={feature} index={idx} />
            ))}
          </ul>

          {/* "Voir plus" toggle for secondary features */}
          {includedSecondaryCount > 0 && (
            <div className="mt-4">
              <button
                onClick={onToggleFeatures}
                className={`
                  w-full flex items-center justify-center gap-2 py-2 px-3
                  text-xs md:text-sm font-medium rounded-lg
                  transition-all duration-200
                  ${showMoreFeatures
                    ? "bg-[#F8935D]/10 text-[#F8935D] border border-[#F8935D]/20"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
                  }
                `}
              >
                {showMoreFeatures ? "Voir moins" : `+${includedSecondaryCount} fonctionnalites`}
                <motion.svg
                  className="w-3 h-3 md:w-4 md:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: showMoreFeatures ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Secondary features - Collapsible */}
              <AnimatePresence initial={false}>
                {showMoreFeatures && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-2 md:space-y-2.5 mt-4 pt-4 border-t border-gray-200">
                      {secondaryFeatures.filter(f => f.included).map((feature, idx) => (
                        <FeatureListItem key={idx} feature={feature} index={idx} />
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ZONE 5: Trust badge */}
        <div className="h-10 md:h-12 mt-auto pt-3 border-t border-gray-200 flex items-center justify-center">
          {!isFree ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[10px] md:text-xs text-gray-400 flex items-center justify-center gap-1.5"
            >
              <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden md:inline">Sans engagement • Annulation a tout moment</span>
              <span className="inline md:hidden">Sans engagement</span>
            </motion.p>
          ) : (
            <p className="text-[10px] md:text-xs text-gray-400">
              Ideal pour decouvrir Posty
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Billing Toggle Component - matches subscription page
function BillingToggle({
  isYearly,
  onChange,
}: {
  isYearly: boolean;
  onChange: (isYearly: boolean) => void;
}) {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    if (isYearly) {
      const duration = 600;
      const steps = 20;
      const increment = 17 / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= 17) {
          setDisplayPercentage(17);
          clearInterval(timer);
        } else {
          setDisplayPercentage(Math.round(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayPercentage(0);
    }
  }, [isYearly]);

  return (
    <div className="inline-flex items-center justify-center">
      {/* Invisible spacer to balance savings badge */}
      <div className="mr-3 flex items-center opacity-0 pointer-events-none select-none" aria-hidden="true" style={{ width: '70px' }}>
        <div className="px-2.5 py-1 bg-transparent rounded-full flex items-center gap-1">
          <span className="text-sm font-bold">-17%</span>
        </div>
      </div>

      {/* Centered container */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Monthly label */}
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`
            text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-colors duration-200
            ${!isYearly ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}
          `}
        >
          Mensuel
        </button>

        {/* Toggle switch */}
        <label className="relative inline-block cursor-pointer shrink-0 w-[46px] h-[26px]">
          <input
            type="checkbox"
            checked={isYearly}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <span className="absolute inset-0 cursor-pointer rounded-full transition-colors duration-200 ease-out bg-gray-300 peer-checked:bg-[#F8935D] hover:bg-gray-400 peer-checked:hover:bg-[#F76B54]" />
          <span
            className="absolute top-1/2 bg-white rounded-full shadow-md pointer-events-none transition-transform duration-200 ease-out"
            style={{
              width: "20px",
              height: "20px",
              left: "3px",
              transform: `translateY(-50%) translateX(${isYearly ? 20 : 0}px)`,
            }}
          />
        </label>

        {/* Yearly label */}
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`
            text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-colors duration-200
            ${isYearly ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}
          `}
        >
          Annuel
        </button>
      </div>

      {/* Animated Savings badge */}
      <div className="ml-3 flex items-center flex-shrink-0" style={{ width: '70px' }}>
        <AnimatePresence mode="wait">
          {isYearly && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, duration: 0.3 }}
              className="relative w-full"
            >
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-sm" />
              <div className="relative px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full shadow-lg shadow-emerald-500/25 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                  -{displayPercentage}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  const handleToggleFeatures = (planId: string) => {
    setExpandedCardIds((prev) => {
      if (prev.includes(planId)) {
        return prev.filter((id) => id !== planId);
      }
      if (prev.length < 3) {
        return [...prev, planId];
      }
      return [...prev.slice(1), planId];
    });
  };

  const getYearlyMonthlyPrice = (plan: PlanConfig) => {
    if (plan.price.yearly === 0) return 0;
    return Math.round((plan.price.yearly / 12) * 100) / 100;
  };

  const getYearlySavings = (plan: PlanConfig) => {
    if (plan.price.monthly === 0) return 0;
    return Math.round((plan.price.monthly * 12 - plan.price.yearly) * 100) / 100;
  };

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAE8DE]/50 to-[#FEF3EE] overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Des tarifs{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              simples et transparents
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-10">
            Choisissez le plan adapte a vos besoins et commencez a transformer votre presence LinkedIn
          </p>

          {/* Billing Toggle - Replicated from subscription page */}
          <BillingToggle
            isYearly={billingPeriod === "yearly"}
            onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
          />
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-start">
          {PLANS.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriod}
              yearlySavings={getYearlySavings(plan)}
              yearlyMonthlyPrice={getYearlyMonthlyPrice(plan)}
              index={index}
              isFeaturesExpanded={expandedCardIds.includes(plan.id)}
              onToggleFeatures={() => handleToggleFeatures(plan.id)}
            />
          ))}
        </div>

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Paiement securise</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F8935D]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Sans engagement</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// FOOTER
// =============================================================================
function Footer() {
  return (
    <footer className="border-t border-[#F0D5C8]/60 py-16 px-4 sm:px-6 lg:px-8 bg-[#FAE8DE]/40">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#F8935D]/10">
                <Image src="/logo-avec fond.jpg" alt="Posty" width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold text-gray-900">Posty</span>
            </Link>
            <p className="text-gray-500 max-w-sm">
              L&apos;outil IA qui transforme vos idees en posts LinkedIn percutants.
              Gagnez du temps, gagnez en visibilite.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-500 hover:text-[#F8935D] transition-colors"
                >
                  Caracteristiques
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-500 hover:text-[#F8935D] transition-colors"
                >
                  Temoignages
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-gray-500 hover:text-[#F8935D] transition-colors"
                >
                  Tarifs
                </button>
              </li>
              <li>
                <Link href="/about" className="text-gray-500 hover:text-[#F8935D] transition-colors">
                  A propos
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/legal/privacy" className="text-gray-500 hover:text-[#F8935D] transition-colors">
                  Politique de confidentialite
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-gray-500 hover:text-[#F8935D] transition-colors">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/legal/notices" className="text-gray-500 hover:text-[#F8935D] transition-colors">
                  Mentions legales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#F0D5C8]/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Posty. Tous droits reserves.
          </p>
          <p className="text-gray-500 text-sm">
            Fait avec passion en France
          </p>
        </div>
      </div>
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
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push(userProfile?.onboardingComplete ? "/app" : "/onboarding");
    }
  }, [loading, user, userProfile, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F8935D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* All sections with soft orange/salmon background */}
      <div className="bg-[#FEF3EE]">
        <DemoSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FounderSection />
        <Footer />
      </div>
    </div>
  );
}
