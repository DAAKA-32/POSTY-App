"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanHover } from "@/hooks/useCanHover";

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
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

export default function ValuePropositionSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();

  // Desktop-only hover animation - subtle y translation only, no scale
  const cardHoverAnimation = canHover ? { y: -6 } : {};

  const values = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Gagnez du temps",
      description: "Créez en 30 secondes ce qui vous prenait 5 minutes",
      metric: "10x plus rapide",
      gradient: "from-primary to-warm-sunset",
      glowColor: "rgba(232, 147, 77, 0.3)",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Contenu optimisé",
      description: "2 versions pour maximiser votre impact",
      metric: "Storytelling + Business",
      gradient: "from-accent to-warm-coral",
      glowColor: "rgba(248, 87, 81, 0.3)",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Engagement maximisé",
      description: "Posts conçus pour générer des interactions",
      metric: "+300% de portée",
      gradient: "from-warning to-orange-600",
      glowColor: "rgba(248, 163, 93, 0.3)",
    },
  ];

  return (
    <section
      id="value-proposition"
      ref={sectionRef}
      className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          custom={0}
          className="text-center mb-12 md:mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            custom={0.1}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Pourquoi choisir{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              POSTY
            </span>{" "}
            ?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            Transformez votre présence LinkedIn avec notre IA
          </motion.p>
        </motion.div>

        {/* Value cards */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              variants={staggerItem}
              whileHover={cardHoverAnimation}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative no-hover-mobile"
            >
              {/* Glow effect on hover - desktop only via CSS */}
              <div
                className="glow-effect absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, ${value.glowColor}, transparent)`,
                }}
              />

              {/* Card */}
              <div className="relative bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 h-full transition-all duration-300">
                {/* Icon with gradient background */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : { scale: 0 }}
                  transition={{
                    delay: 0.2 + index * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                  className={`
                    w-16 h-16 rounded-xl mb-6
                    bg-gradient-to-br ${value.gradient}
                    flex items-center justify-center
                    shadow-lg
                    transition-shadow duration-300
                  `}
                >
                  <div className="text-white">
                    {value.icon}
                  </div>
                </motion.div>

                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 transition-colors">
                  {value.title}
                </h3>

                <p className="text-text-secondary mb-4 leading-relaxed">
                  {value.description}
                </p>

                {/* Metric badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-elevated/50 border border-dark-border rounded-lg">
                  <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-white">
                    {value.metric}
                  </span>
                </div>

                {/* Arrow indicator on hover */}
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  whileHover={{ x: 0, opacity: 1 }}
                  className="absolute bottom-6 right-6 text-primary"
                  aria-hidden="true"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-text-muted mb-6">
            Rejoignez des milliers de professionnels qui utilisent POSTY
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background hover:shadow-xl hover:brightness-110"
            aria-label="Commencer gratuitement"
          >
            Commencer gratuitement
          </button>
        </motion.div>
      </div>
    </section>
  );
}
