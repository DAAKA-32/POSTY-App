"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanHover } from "@/hooks/useCanHover";
import {
  AnimatedFeatureIcon,
  FadeInSection,
  StaggerOnScroll,
} from "@/components/animations";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

export default function FeaturesSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();

  // Track active feature for mobile tap interaction
  const [activeFeatureIndex, setActiveFeatureIndex] = useState<number | null>(null);

  // Only apply hover animations on desktop with mouse - completely disabled on mobile
  // Removed scale effects for a more subtle, professional feel
  const hoverAnimation = canHover ? { y: -4 } : undefined;
  const featureHoverAnimation = canHover ? { y: -4 } : undefined;

  // Handle tap on feature for mobile - toggle active state
  const handleFeatureTap = (index: number) => {
    if (canHover) return; // Don't handle taps on desktop with hover
    setActiveFeatureIndex(prev => prev === index ? null : index);
  };

  // Close active feature when tapping outside
  const handleSectionClick = (e: React.MouseEvent) => {
    if (!canHover && activeFeatureIndex !== null) {
      const target = e.target as HTMLElement;
      if (!target.closest('.feature-card')) {
        setActiveFeatureIndex(null);
      }
    }
  };

  const features = [
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      title: t.landing.fastGeneration || "Génération rapide",
      description: t.landing.inSeconds || "Posts créés en quelques secondes",
      color: "primary",
      animation: "float" as const,
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t.landing.twoVersions || "Deux versions",
      description:
        t.landing.storytellingBusiness || "Storytelling & Business",
      color: "accent",
      animation: "bounce" as const,
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: t.landing.intelligent || "IA performante",
      description: t.landing.poweredByAI || "Propulsé par GPT-4",
      color: "warning",
      animation: "pulse" as const,
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
      title: "Publication directe",
      description: "Publiez sur LinkedIn en un clic",
      color: "primary",
      animation: "float" as const,
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
      title: "Personnalisation",
      description: "Ajustez le ton et le style",
      color: "accent",
      animation: "bounce" as const,
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: "Historique",
      description: "Retrouvez tous vos posts",
      color: "warning",
      animation: "pulse" as const,
    },
  ];

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-20 md:py-32 px-4 md:px-8 overflow-hidden"
      onClick={handleSectionClick}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          custom={0}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            custom={0.1}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-primary/10 border border-primary/20 rounded-full"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-2 h-2 bg-accent rounded-full"
            />
            <span className="text-sm text-primary font-medium">
              {t.landing.poweredByAI || "Propulsé par l'IA"}
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            custom={0.2}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-silver-shimmer mb-4"
          >
            {t.landing.contentValidatedTitle ||
              "Créez du contenu validé et impactant"}
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.3}
            className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto"
          >
            {t.landing.contentValidatedDesc ||
              "POSTY génère deux versions optimisées pour maximiser votre engagement sur LinkedIn"}
          </motion.p>
        </motion.div>

        {/* Version A & B Cards - Premium Highlight */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto"
        >
          {/* Version A - Storytelling */}
          <motion.div
            variants={staggerItem}
            whileHover={hoverAnimation}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative group"
          >
            {/* Glow effect - desktop only */}
            {canHover && (
              <div className="glow-effect absolute -inset-1 bg-gradient-to-r from-accent to-accent/50 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
            )}
            <div className="relative bg-dark-card border border-dark-border rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold text-xl">
                  A
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {t.landing.versionA || "Version Storytelling"}
                  </h3>
                  <p className="text-sm text-accent font-medium">
                    Émotionnel & Engageant
                  </p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                {t.landing.versionADesc ||
                  "Une approche narrative qui captive votre audience avec des histoires authentiques et mémorables"}
              </p>
            </div>
          </motion.div>

          {/* Version B - Business */}
          <motion.div
            variants={staggerItem}
            whileHover={hoverAnimation}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative group"
          >
            {/* Glow effect - desktop only */}
            {canHover && (
              <div className="glow-effect absolute -inset-1 bg-gradient-to-r from-primary to-primary/50 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
            )}
            <div className="relative bg-dark-card border border-dark-border rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xl">
                  B
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {t.landing.versionB || "Version Business"}
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    Professionnel & Concret
                  </p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                {t.landing.versionBDesc ||
                  "Un contenu structuré et factuel qui établit votre expertise et crédibilité professionnelle"}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <StaggerOnScroll className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const isActive = activeFeatureIndex === index;
            const isMobileActive = !canHover && isActive;

            return (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={featureHoverAnimation}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`
                  group relative feature-card cursor-pointer
                  transition-transform duration-300 ease-out
                  ${isMobileActive ? 'mobile-active' : ''}
                `}
                onClick={() => handleFeatureTap(index)}
              >
                {/* Glow effect - desktop: CSS hover, mobile: JS active class */}
                <div
                  className={`
                    glow-effect absolute -inset-0.5 rounded-2xl blur-md
                    transition-opacity duration-300 pointer-events-none
                    ${
                      feature.color === "primary"
                        ? "bg-gradient-to-r from-primary/60 to-primary/30"
                        : feature.color === "accent"
                          ? "bg-gradient-to-r from-accent/60 to-accent/30"
                          : "bg-gradient-to-r from-warning/60 to-warning/30"
                    }
                    ${canHover ? 'opacity-0 group-hover:opacity-100' : ''}
                  `}
                  style={isMobileActive ? { opacity: 1 } : undefined}
                />

                {/* Card Inner */}
                <div
                  className={`
                    feature-card-inner relative bg-dark-card rounded-2xl p-6 h-full
                    border transition-all duration-300
                    ${isMobileActive
                      ? `border-${feature.color}/40 shadow-lg`
                      : 'border-dark-border'
                    }
                  `}
                  style={isMobileActive ? {
                    borderColor: feature.color === 'primary'
                      ? 'rgba(232, 147, 77, 0.4)'
                      : feature.color === 'accent'
                        ? 'rgba(248, 87, 81, 0.4)'
                        : 'rgba(251, 191, 36, 0.4)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                  } : undefined}
                >
                  <div className="flex items-start gap-4">
                    {/* Animated Icon */}
                    <AnimatedFeatureIcon
                      animation={feature.animation}
                      color={feature.color}
                      icon={feature.icon}
                    />

                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-text-muted text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* Mobile "Découvrir" button - only shown on mobile when active */}
                  <AnimatePresence>
                    {isMobileActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Scroll to top to access the main CTA
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`
                            w-full py-3 rounded-xl font-medium text-sm transition-all duration-200
                            active:scale-[0.98]
                            ${feature.color === "primary"
                              ? "bg-primary/20 text-primary border border-primary/40 active:bg-primary/30"
                              : feature.color === "accent"
                                ? "bg-accent/20 text-accent border border-accent/40 active:bg-accent/30"
                                : "bg-warning/20 text-warning border border-warning/40 active:bg-warning/30"
                            }
                          `}
                        >
                          {t.common.discover || "Découvrir"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </StaggerOnScroll>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`
              px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl
              shadow-glow transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
              active:scale-[0.98]
              ${canHover ? 'hover:shadow-xl hover:brightness-110' : ''}
            `}
            aria-label={t.common.tryNow || "Essayer gratuitement"}
          >
            {t.common.tryNow || "Essayer gratuitement"}
          </button>
          <p className="text-text-muted text-sm mt-4">
            {t.landing.noCardRequired || "Aucune carte bancaire requise"} •{" "}
            {t.landing.freePercent || "100% gratuit"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
