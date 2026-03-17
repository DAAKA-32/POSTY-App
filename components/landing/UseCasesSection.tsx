"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanHover } from "@/hooks/ui/useCanHover";

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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

export default function UseCasesSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();

  // Desktop-only hover animation
  const cardHoverAnimation = canHover ? { y: -8 } : {};

  const useCases = [
    {
      title: t.landing.useCaseEntrepreneursTitle,
      subtitle: t.landing.useCaseEntrepreneursSubtitle,
      description: t.landing.useCaseEntrepreneursDesc,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: "from-primary via-primary-dark to-warning",
      glowColor: "rgba(232, 147, 77, 0.4)",
      benefits: [
        t.landing.useCaseEntrepreneursBenefit1,
        t.landing.useCaseEntrepreneursBenefit2,
        t.landing.useCaseEntrepreneursBenefit3,
      ],
      emoji: "🚀",
    },
    {
      title: t.landing.useCaseConsultantsTitle,
      subtitle: t.landing.useCaseConsultantsSubtitle,
      description: t.landing.useCaseConsultantsDesc,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      gradient: "from-accent via-warm-coral to-rose-600",
      glowColor: "rgba(248, 87, 81, 0.4)",
      benefits: [
        t.landing.useCaseConsultantsBenefit1,
        t.landing.useCaseConsultantsBenefit2,
        t.landing.useCaseConsultantsBenefit3,
      ],
      emoji: "💡",
    },
    {
      title: t.landing.useCaseRecruitersTitle,
      subtitle: t.landing.useCaseRecruitersSubtitle,
      description: t.landing.useCaseRecruitersDesc,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: "from-warning via-orange-600 to-orange-700",
      glowColor: "rgba(248, 163, 93, 0.4)",
      benefits: [
        t.landing.useCaseRecruitersBenefit1,
        t.landing.useCaseRecruitersBenefit2,
        t.landing.useCaseRecruitersBenefit3,
      ],
      emoji: "🎯",
    },
    {
      title: t.landing.useCaseCoachesTitle,
      subtitle: t.landing.useCaseCoachesSubtitle,
      description: t.landing.useCaseCoachesDesc,
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      gradient: "from-accent via-accent-hover to-primary",
      glowColor: "rgba(248, 87, 81, 0.4)",
      benefits: [
        t.landing.useCaseCoachesBenefit1,
        t.landing.useCaseCoachesBenefit2,
        t.landing.useCaseCoachesBenefit3,
      ],
      emoji: "✨",
    },
  ];

  return (
    <section
      id="use-cases"
      ref={sectionRef}
      className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
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
            {t.landing.useCasesMainTitle}{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.landing.useCasesMainTitleHighlight}
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            {t.landing.useCasesSubtitle}
          </motion.p>
        </motion.div>

        {/* Use Cases Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
        >
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              variants={staggerItem}
              whileHover={cardHoverAnimation}
              className="group relative no-hover-mobile"
            >
              {/* Glow effect on hover - desktop only via CSS */}
              <div
                className="glow-effect absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, ${useCase.glowColor}, transparent)`,
                }}
              />

              {/* Card */}
              <div className="relative h-full bg-dark-card border border-dark-border rounded-3xl overflow-hidden transition-all duration-300">
                {/* Gradient header */}
                <div className={`relative px-6 md:px-8 pt-6 md:pt-8 pb-4 bg-gradient-to-br ${useCase.gradient}`}>
                  {/* Emoji badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                    transition={{
                      delay: 0.3 + index * 0.1,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg"
                  >
                    {useCase.emoji}
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : { scale: 0 }}
                    transition={{
                      delay: 0.2 + index * 0.1,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 text-white shadow-xl"
                  >
                    {useCase.icon}
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-bold text-silver-solid mb-1">
                    {useCase.title}
                  </h3>
                  <p className="text-white/90 text-sm md:text-base font-medium">
                    {useCase.subtitle}
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 md:px-8 py-6 md:py-8 space-y-6">
                  {/* Description */}
                  <p className="text-text-secondary leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Benefits list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                      {t.landing.useCasesBenefitsLabel}
                    </h4>
                    <ul className="space-y-2">
                      {useCase.benefits.map((benefit, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                          transition={{ delay: 0.4 + index * 0.1 + i * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <svg className="w-5 h-5 text-accent shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-text-secondary leading-relaxed">
                            {benefit}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Arrow indicator */}
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
          transition={{ duration: 0.6, delay: 1 }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-text-muted mb-6 text-lg">
            {t.landing.useCasesCTA}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background desktop-hover-scale"
            aria-label={t.landing.useCasesButton}
          >
            {t.landing.useCasesButton}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
