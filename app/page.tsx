"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthPanel from "@/components/auth/AuthPanel";
import ConnectionLoader from "@/components/shared/ConnectionLoader";

// Stats data with numeric values for animation
const STATS = [
  { value: 10000, display: "10K+", label: "Utilisateurs" },
  { value: 50000, display: "50K+", label: "Posts generes" },
  { value: 4.9, display: "4.9", label: "Note moyenne" },
];

// Animated counter component
function AnimatedCounter({ value, display, delay = 0 }: { value: number; display: string; delay?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    const duration = 1500;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(current);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  // Format the count based on the display format
  const formatCount = () => {
    if (display.includes("K+")) {
      return count >= 1000 ? `${Math.floor(count / 1000)}K+` : Math.floor(count).toString();
    }
    if (display.includes(".")) {
      return count.toFixed(1);
    }
    return Math.floor(count).toString();
  };

  return <span ref={ref}>{isInView ? formatCount() : "0"}</span>;
}

// Premium easing curves for instant, professional animations
const smoothEase = [0.25, 0.46, 0.45, 0.94] as const;
const entryEase = [0.0, 0.0, 0.2, 1] as const; // Fast start, smooth landing
const bounceEase = [0.34, 1.2, 0.64, 1] as const; // Subtle bounce

// Animation variants - Optimized for INSTANT display, no splash
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay,
      ease: entryEase,
    },
  }),
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      delay,
      ease: bounceEase,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: entryEase,
    },
  },
};

const slideInFromLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      delay,
      ease: entryEase,
    },
  }),
};

// Instant hero entrance - no delay
const heroInstant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

export default function LandingPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Redirect authenticated users (only after auth check completes)
  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);
      if (!userProfile?.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router]);

  // Show loader ONLY when user is authenticated and redirecting
  // Visitors see the landing page immediately - no loader!
  if (redirecting) {
    return <ConnectionLoader message="Redirection vers votre espace..." />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background gradient effects - Global with subtle animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          initial={{ opacity: 0.5, scale: 1 }}
          animate={prefersReducedMotion ? { opacity: 0.5, scale: 1 } : {
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0.5, scale: 1 }}
          animate={prefersReducedMotion ? { opacity: 0.5, scale: 1 } : {
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0.5, scale: 1 }}
          animate={prefersReducedMotion ? { opacity: 0.5, scale: 1 } : {
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="hidden xl:block absolute top-0 right-1/3 w-96 h-96 bg-primary/3 rounded-full blur-3xl"
        />
      </div>

      {/* ===== MOBILE LAYOUT: Auth first, Landing below ===== */}
      <div className="md:hidden relative z-10 overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Auth Section - Flexible height, allows scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="min-h-[100dvh] flex flex-col px-4 py-8 safe-area-inset-bottom"
        >
          <AuthPanel onSuccess={() => {}} />

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease: entryEase }}
            className="mt-auto pt-8 flex flex-col items-center text-text-muted"
          >
            <span className="text-xs mb-2">Decouvrir POSTY</span>
            <motion.svg
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          </motion.div>
        </motion.div>

        {/* Landing Sections - Below auth */}
        <div className="bg-dark-card">
          {/* Hero Section */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="px-6 py-16 text-center border-b border-dark-border"
          >
            <motion.div variants={fadeInScale} custom={0} className="relative inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-glow mx-auto overflow-hidden">
                <img
                  src="/logo.png"
                  alt="POSTY Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <span className="text-white font-bold text-4xl hidden items-center justify-center">P</span>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg blur-xl -z-10"
              />
            </motion.div>
            <motion.h2 variants={fadeInUp} custom={0.08} className="text-2xl font-bold text-white mb-3">
              Votre IA pour creer des posts LinkedIn <span className="text-gradient">impactants</span>.
            </motion.h2>
            <motion.p variants={fadeInUp} custom={0.15} className="text-text-secondary">Simple. Rapide. Premium.</motion.p>
          </motion.section>

          {/* Features */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="px-6 py-16 border-b border-dark-border"
          >
            <motion.h2 variants={fadeInUp} custom={0} className="text-xl font-bold text-white mb-2 text-center">Du contenu valide par vous</motion.h2>
            <motion.p variants={fadeInUp} custom={0.1} className="text-text-secondary text-center mb-8">2 versions par post. Vous choisissez, vous publiez.</motion.p>
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
              <motion.div variants={staggerItem} className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-accent font-bold">A</div>
                <div>
                  <p className="text-white font-medium">Version Storytelling</p>
                  <p className="text-sm text-text-muted">Authentique, engageante, inspirante</p>
                </div>
              </motion.div>
              <motion.div variants={staggerItem} className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold">B</div>
                <div>
                  <p className="text-white font-medium">Version Business</p>
                  <p className="text-sm text-text-muted">Professionnelle, directe, impactante</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.section>

          {/* Features hints - Mobile icons */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="px-6 py-12 border-b border-dark-border"
          >
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-4">
              <motion.div variants={staggerItem} className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted">Rapide</p>
              </motion.div>
              <motion.div variants={staggerItem} className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted">Intelligent</p>
              </motion.div>
              <motion.div variants={staggerItem} className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-warning/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted">Impactant</p>
              </motion.div>
            </motion.div>
          </motion.section>

          {/* Stats */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="px-6 py-16 border-b border-dark-border"
          >
            <motion.h2 variants={fadeInUp} custom={0} className="text-xl font-bold text-white mb-2 text-center">Gagnez en visibilite</motion.h2>
            <motion.p variants={fadeInUp} custom={0.1} className="text-text-secondary text-center mb-8">Sans effort, developpez votre credibilite pro</motion.p>
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-4">
              {STATS.map((s, i) => (
                <motion.div key={s.label} variants={staggerItem} className="text-center">
                  <p className={`text-2xl font-bold ${i === 0 ? "text-white" : i === 1 ? "text-accent" : "text-primary"}`}>
                    <AnimatedCounter value={s.value} display={s.display} delay={i * 200} />
                  </p>
                  <p className="text-xs text-text-muted">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* Testimonial */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="px-6 py-16 border-b border-dark-border text-center"
          >
            <motion.p variants={fadeInUp} custom={0} className="text-white italic mb-4">
              "POSTY a revolutionne ma facon de creer du contenu LinkedIn."
            </motion.p>
            <motion.p variants={fadeInUp} custom={0.2} className="text-text-secondary font-medium">Marie L.</motion.p>
            <motion.p variants={fadeInUp} custom={0.3} className="text-xs text-text-muted">Marketing Manager</motion.p>
          </motion.section>

          {/* CTA Freemium */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="px-6 py-8"
          >
            <motion.div
              variants={fadeInUp}
              custom={0}
              className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-5"
            >
              <p className="text-white font-medium mb-1 text-center">Commencez gratuitement</p>
              <p className="text-sm text-text-muted text-center mb-4">
                3 posts gratuits par semaine. Passez en Pro pour plus.
              </p>
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg shadow-glow"
                >
                  Essayer maintenant
                </motion.button>
                <Link
                  href="/pricing"
                  className="block w-full py-3 bg-dark-bg/50 border border-dark-border text-text-secondary text-sm font-medium rounded-lg text-center"
                >
                  Voir les plans
                </Link>
              </div>
              {/* Trust badges */}
              <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-dark-border/30">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Sans carte
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Donnees privees
                </div>
              </div>
            </motion.div>
          </motion.section>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="px-6 py-6 border-t border-dark-border"
          >
            <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
              <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Confidentialite</a>
              <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">CGU</a>
              <a href="/legal/notices" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Mentions legales</a>
            </div>
          </motion.footer>
        </div>
      </div>

      {/* ===== DESKTOP / TABLET LAYOUT: Split screen 50/50 ===== */}
      <div className="hidden md:flex h-screen relative z-10">
        {/* Left: Full Landing Content (Scrollable, no visible scrollbar) */}
        <div
          className="w-1/2 h-screen overflow-y-auto overflow-x-hidden bg-dark-card/50 scroll-smooth overscroll-contain"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>

          <div className="flex flex-col">
            {/* Header */}
            <motion.header
              initial="hidden"
              animate="visible"
              variants={slideInFromLeft}
              custom={0}
              className="p-6 lg:p-8 xl:p-10 flex items-center justify-between"
            >
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center shadow-glow"
                >
                  <img
                    src="/logo.png"
                    alt="POSTY Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold text-xl lg:text-2xl hidden items-center justify-center">P</span>
                </motion.div>
                <span className="font-semibold text-white text-xl lg:text-2xl tracking-tight">POSTY</span>
              </motion.div>
            </motion.header>

            {/* Hero Section */}
            <section className="flex-1 px-6 lg:px-10 xl:px-14 py-8 lg:py-12">
              {/* Badge */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                custom={0.05}
                className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-primary/10 border border-primary/20 rounded-full"
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 bg-accent rounded-full"
                />
                <span className="text-sm text-primary font-medium">Propulse par l&apos;IA</span>
              </motion.div>

              {/* Tagline */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                custom={0.12}
                className="mb-6 lg:mb-8"
              >
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                  Votre IA pour creer des posts LinkedIn{" "}
                  <motion.span
                    className="text-gradient inline-block"
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  >
                    impactants
                  </motion.span>.
                </h1>
                <p className="text-lg lg:text-xl text-text-secondary">
                  Simple. Rapide. Premium.
                </p>
              </motion.div>

              {/* Description */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                custom={0.18}
                className="mb-8"
              >
                <p className="text-text-secondary text-base lg:text-lg max-w-md">
                  Generez, choisissez et optimisez vos posts avant meme d&apos;etre connecte.
                  Deux versions uniques pour chaque idee : Storytelling et Business.
                </p>
              </motion.div>

              {/* Features cards */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-3 mb-10"
              >
                <motion.div
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, x: 10, borderColor: "rgba(16, 185, 129, 0.5)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex items-center gap-4 p-4 bg-dark-bg/50 rounded-lg border border-dark-border/50 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center text-accent font-bold shrink-0">A</div>
                  <div>
                    <p className="text-white font-medium">Version Storytelling</p>
                    <p className="text-sm text-text-muted">Authentique, engageante, inspirante</p>
                  </div>
                </motion.div>
                <motion.div
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, x: 10, borderColor: "rgba(99, 102, 241, 0.5)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex items-center gap-4 p-4 bg-dark-bg/50 rounded-lg border border-dark-border/50 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">B</div>
                  <div>
                    <p className="text-white font-medium">Version Business</p>
                    <p className="text-sm text-text-muted">Professionnelle, directe, impactante</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Features icons row */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="flex items-center gap-8"
              >
                <motion.div variants={staggerItem} className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-white font-medium">Generation rapide</p>
                    <p className="text-sm text-text-muted">En quelques secondes</p>
                  </div>
                </motion.div>
                <motion.div variants={staggerItem} className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -10 }}
                    className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-white font-medium">2 versions</p>
                    <p className="text-sm text-text-muted">Storytelling & Business</p>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Chat Mockup Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInScale}
              custom={0}
              className="px-6 lg:px-10 xl:px-14 py-10 border-t border-dark-border/30"
            >
              <div className="relative max-w-lg">
                {/* Glow behind mockup */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg blur-2xl"
                />

                {/* Chat mockup */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative bg-dark-card border border-dark-border rounded-lg shadow-elevated overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-dark-border flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src="/logo.png"
                        alt="POSTY"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (sibling) sibling.style.display = 'flex';
                        }}
                      />
                      <span className="text-white font-bold text-sm hidden items-center justify-center">P</span>
                    </div>
                    <span className="font-medium text-white text-sm">POSTY</span>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="ml-auto px-2 py-1 bg-accent/10 text-accent text-xs rounded-full"
                    >
                      En ligne
                    </motion.span>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 bg-dark-bg/50">
                    {/* User message */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] px-3 py-2 bg-primary/20 border border-primary/30 rounded-lg rounded-br-md">
                        <p className="text-white text-sm">Je veux un post sur le leadership</p>
                      </div>
                    </motion.div>

                    {/* AI response */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="flex gap-2"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-xs">P</span>
                      </div>
                      <div className="max-w-[90%] space-y-2">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8, duration: 0.4 }}
                          className="px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg rounded-bl-md"
                        >
                          <p className="text-xs text-accent font-medium mb-1">Storytelling</p>
                          <p className="text-white text-xs leading-relaxed">
                            Il y a 3 ans, j&apos;ai commis ma plus grande erreur...
                          </p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 1, duration: 0.4 }}
                          className="px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg rounded-bl-md"
                        >
                          <p className="text-xs text-primary font-medium mb-1">Business</p>
                          <p className="text-white text-xs leading-relaxed">
                            Les meilleurs leaders ecoutent plus qu&apos;ils ne parlent...
                          </p>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Floating badges */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-3 -right-3 px-2.5 py-1 bg-accent text-dark-bg text-xs font-semibold rounded-full shadow-lg"
                >
                  IA Generative
                </motion.div>
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-3 -left-3 px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded-full shadow-lg"
                >
                  100% Gratuit
                </motion.div>
              </div>
            </motion.section>

            {/* CTA Freemium Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="px-6 lg:px-10 xl:px-14 py-8 border-t border-dark-border/30"
            >
              <motion.div
                variants={fadeInUp}
                custom={0}
                className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Commencez gratuitement</p>
                    <p className="text-sm text-text-muted leading-relaxed">
                      3 posts gratuits par semaine. Passez en Pro ou Max pour un acces illimite.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => document.querySelector('#auth-panel')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary to-accent text-white text-sm font-medium rounded-lg shadow-glow"
                  >
                    Essayer maintenant
                  </motion.button>
                  <Link
                    href="/pricing"
                    className="flex-1 py-2.5 px-4 bg-dark-bg/50 border border-dark-border text-text-secondary text-sm font-medium rounded-lg text-center hover:text-white hover:border-primary/30 transition-all duration-200"
                  >
                    Voir les plans
                  </Link>
                </div>
                {/* Trust badges */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Aucune carte requise
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Donnees privees
                  </div>
                </div>
              </motion.div>
            </motion.section>

            {/* Stats Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="px-6 lg:px-10 xl:px-14 py-10 border-t border-dark-border/30"
            >
              <motion.h2 variants={fadeInUp} custom={0} className="text-xl font-bold text-white mb-2">Gagnez en visibilite sans effort</motion.h2>
              <motion.p variants={fadeInUp} custom={0.1} className="text-text-secondary mb-6">Publiez regulierement, developpez votre credibilite</motion.p>
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-6">
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    variants={staggerItem}
                    whileHover={{ scale: 1.1 }}
                    className="text-center cursor-default"
                  >
                    <p className={`text-3xl font-bold mb-1 ${i === 0 ? "text-white" : i === 1 ? "text-accent" : "text-primary"}`}>
                      <AnimatedCounter value={s.value} display={s.display} delay={i * 200} />
                    </p>
                    <p className="text-sm text-text-muted">{s.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>

            {/* Testimonial Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="px-6 lg:px-10 xl:px-14 py-10 border-t border-dark-border/30"
            >
              <motion.blockquote variants={fadeInUp} custom={0}>
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  className="text-white italic mb-4 text-lg"
                >
                  "POSTY a revolutionne ma facon de creer du contenu LinkedIn. Je gagne des heures chaque semaine."
                </motion.p>
                <motion.footer
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-10 h-10 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white font-medium text-sm">ML</span>
                  </motion.div>
                  <div>
                    <p className="text-white text-sm font-medium">Marie L.</p>
                    <p className="text-text-muted text-xs">Marketing Manager</p>
                  </div>
                </motion.footer>
              </motion.blockquote>
            </motion.section>

            {/* Footer */}
            <motion.footer
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="px-6 lg:px-10 xl:px-14 py-6 border-t border-dark-border/30 mt-auto"
            >
              <div className="flex gap-6 text-xs text-text-muted">
                <Link href="/legal/privacy" className="hover:text-white transition-colors duration-200">Confidentialite</Link>
                <Link href="/legal/terms" className="hover:text-white transition-colors duration-200">CGU</Link>
                <Link href="/legal/notices" className="hover:text-white transition-colors duration-200">Mentions legales</Link>
              </div>
            </motion.footer>
          </div>
        </div>

        {/* Right: Auth Panel (Fixed position, scrollable if needed) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: entryEase }}
          className="w-1/2 h-screen flex items-center justify-center p-6 lg:p-10 xl:p-14 bg-background overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <AuthPanel onSuccess={() => {}} />
        </motion.div>
      </div>
    </div>
  );
}
