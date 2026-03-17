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
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

const lineAnimation = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: {
      duration: 0.8,
      delay: 0.4,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

export default function HowItWorksSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();

  const steps = [
    {
      number: 1,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: t.landing.howItWorksStep1Title,
      description: t.landing.howItWorksStep1Desc,
      color: "from-primary to-primary-dark",
      glowColor: "rgba(232, 147, 77, 0.3)",
      example: t.landing.howItWorksStep1Example,
    },
    {
      number: 2,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: t.landing.howItWorksStep2Title,
      description: t.landing.howItWorksStep2Desc,
      color: "from-accent to-warm-coral",
      glowColor: "rgba(248, 87, 81, 0.3)",
      example: t.landing.howItWorksStep2Example,
    },
    {
      number: 3,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t.landing.howItWorksStep3Title,
      description: t.landing.howItWorksStep3Desc,
      color: "from-warning to-orange-600",
      glowColor: "rgba(248, 163, 93, 0.3)",
      example: t.landing.howItWorksStep3Example,
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          custom={0}
          className="text-center mb-12 md:mb-20"
        >
          <motion.h2
            variants={fadeInUp}
            custom={0.1}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            {t.landing.howItWorksTitle1}{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.landing.howItWorksTitle2}
            </span>{" "}
            {t.landing.howItWorksTitle3}
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            {t.landing.howItWorksSubtitle}
          </motion.p>
        </motion.div>

        {/* Steps Timeline */}
        <motion.ol
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="relative space-y-8 md:space-y-12 list-none"
          role="list"
          aria-label={t.landing.howItWorksSubtitle}
        >
          {/* Vertical connecting line (desktop only) */}
          <div className="hidden md:block absolute left-[60px] top-[80px] bottom-[80px] w-0.5 overflow-hidden">
            <motion.div
              variants={lineAnimation}
              className="w-full h-full bg-gradient-to-b from-primary via-accent to-warning origin-top"
              style={{ transformOrigin: "top" }}
            />
          </div>

          {steps.map((step, index) => (
            <motion.li
              key={step.number}
              variants={staggerItem}
              className="relative"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                {/* Step number + icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{
                    delay: 0.2 + index * 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="relative shrink-0"
                >
                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                    style={{
                      background: `linear-gradient(135deg, ${step.glowColor}, transparent)`,
                    }}
                  />

                  {/* Icon container */}
                  <div
                    className={`
                      relative w-[120px] h-[120px] rounded-2xl
                      bg-gradient-to-br ${step.color}
                      flex flex-col items-center justify-center
                      shadow-xl
                    `}
                  >
                    <span className="text-white/80 text-sm font-semibold mb-1">
                      {t.landing.howItWorksStepLabel} {step.number}
                    </span>
                    <div className="text-white">
                      {step.icon}
                    </div>
                  </div>
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ delay: 0.3 + index * 0.2 }}
                    className="bg-dark-card border border-dark-border rounded-xl p-6 md:p-8 transition-all duration-300 group feature-card-desktop"
                  >
                    <h3 className="text-2xl md:text-3xl font-bold text-silver-solid mb-3 transition-all">
                      {step.title}
                    </h3>
                    <p className="text-text-secondary text-base md:text-lg leading-relaxed mb-4">
                      {step.description}
                    </p>

                    {/* Example badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-elevated/70 border border-dark-border rounded-lg">
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-text-muted">
                        {step.example}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="text-text-muted mb-6 text-lg">
            {t.landing.howItWorksReadyCTA}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background desktop-hover-scale"
            aria-label={t.landing.howItWorksTryFree}
          >
            {t.landing.howItWorksTryFree}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
