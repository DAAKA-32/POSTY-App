"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const premiumEase = [0.22, 1, 0.36, 1] as const;

export default function HowItWorksSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const steps = [
    {
      number: 1,
      title: t.landing.howItWorksStep1Title,
      description: t.landing.howItWorksStep1Desc,
      example: t.landing.howItWorksStep1Example,
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      gradient: "from-[#F8935D] to-[#F76B54]",
    },
    {
      number: 2,
      title: t.landing.howItWorksStep2Title,
      description: t.landing.howItWorksStep2Desc,
      example: t.landing.howItWorksStep2Example,
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: "from-[#F76B54] to-[#E85D50]",
    },
    {
      number: 3,
      title: t.landing.howItWorksStep3Title,
      description: t.landing.howItWorksStep3Desc,
      example: t.landing.howItWorksStep3Example,
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-[#E85D50] to-[#D94E45]",
    },
    {
      number: 4,
      title: t.landing.howItWorksStep4Title,
      description: t.landing.howItWorksStep4Desc,
      example: t.landing.howItWorksStep4Example,
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-[#D94E45] to-[#C44038]",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: premiumEase }}
          className="text-center mb-14 md:mb-20"
        >
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-gray-900 mb-4 leading-tight">
            {t.landing.howItWorksTitle1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              {t.landing.howItWorksTitle2}
            </span>{" "}
            {t.landing.howItWorksTitle3}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
            {t.landing.howItWorksSubtitle}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical connector line (desktop) */}
          <div className="hidden md:block absolute left-[39px] top-[60px] bottom-[60px] w-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : undefined}
              transition={{ duration: 1.2, delay: 0.3, ease: premiumEase }}
              className="w-full h-full bg-gradient-to-b from-[#F8935D]/40 via-[#F76B54]/30 to-[#C44038]/20 origin-top"
            />
          </div>

          <ol className="space-y-6 md:space-y-10 list-none" role="list">
            {steps.map((step, index) => (
              <motion.li
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + index * 0.15,
                  ease: premiumEase,
                }}
                className="relative"
              >
                <div className="flex items-start gap-5 md:gap-8">
                  {/* Step circle */}
                  <div className="relative shrink-0">
                    <div
                      className={`
                        w-[78px] h-[78px] rounded-2xl
                        bg-gradient-to-br ${step.gradient}
                        flex flex-col items-center justify-center
                        shadow-lg
                      `}
                    >
                      <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">
                        {t.landing.howItWorksStepLabel}
                      </span>
                      <span className="text-white text-xl font-bold -mt-0.5">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200/60 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`text-transparent bg-clip-text bg-gradient-to-r ${step.gradient}`}>
                        <div className="text-[#F8935D]">
                          {step.icon}
                        </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-500 text-[15px] md:text-base leading-relaxed mb-3">
                      {step.description}
                    </p>

                    {/* Example pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FEF3EE] border border-[#F0D5C8]/50 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-[#F8935D] shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {step.example}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-center mt-14 md:mt-20"
        >
          <p className="text-gray-500 mb-5 text-lg">
            {t.landing.howItWorksReadyCTA}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-8 py-3.5 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F8935D] focus:ring-offset-2 focus:ring-offset-[#FEF3EE]"
            aria-label={t.landing.howItWorksTryFree}
          >
            {t.landing.howItWorksTryFree}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
