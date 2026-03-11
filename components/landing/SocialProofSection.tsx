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
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

const counterAnimation = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function SocialProofSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();

  // Desktop-only hover animations
  const statHoverAnimation = canHover ? { scale: 1.05, y: -5 } : {};
  const testimonialHoverAnimation = canHover ? { y: -10 } : {};

  const stats = [
    {
      value: "15K+",
      label: t.landing.socialProofStatUsers,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "from-primary to-primary-dark",
    },
    {
      value: "500K+",
      label: t.landing.socialProofStatPosts,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "from-accent to-warm-coral",
    },
    {
      value: "4.9/5",
      label: t.landing.socialProofStatRating,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
      color: "from-warning to-orange-600",
    },
    {
      value: "+300%",
      label: t.landing.socialProofStatEngagement,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: "from-primary to-accent",
    },
  ];

  const testimonials = [
    {
      name: t.landing.socialProofTestimonial1Name,
      role: t.landing.socialProofTestimonial1Role,
      company: t.landing.socialProofTestimonial1Company,
      avatar: "SM",
      content: t.landing.socialProofTestimonial1Content,
      rating: 5,
      gradient: "from-primary to-primary-dark",
    },
    {
      name: t.landing.socialProofTestimonial2Name,
      role: t.landing.socialProofTestimonial2Role,
      company: t.landing.socialProofTestimonial2Company,
      avatar: "TD",
      content: t.landing.socialProofTestimonial2Content,
      rating: 5,
      gradient: "from-accent to-warm-coral",
    },
    {
      name: t.landing.socialProofTestimonial3Name,
      role: t.landing.socialProofTestimonial3Role,
      company: t.landing.socialProofTestimonial3Company,
      avatar: "ML",
      content: t.landing.socialProofTestimonial3Content,
      rating: 5,
      gradient: "from-warning to-orange-600",
    },
  ];

  return (
    <section
      id="social-proof"
      ref={sectionRef}
      className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden bg-dark-elevated/30"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
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
            {t.landing.socialProofTitle1}{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.landing.socialProofTitle2}
            </span>{" "}
            {t.landing.socialProofTitle3}
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            {t.landing.socialProofSubtitle}
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              whileHover={statHoverAnimation}
              className="group relative no-hover-mobile"
            >
              {/* Glow effect on hover - desktop only via CSS */}
              <div className="glow-effect absolute -inset-1 bg-gradient-to-br opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500 rounded-2xl from-primary/30 to-accent/30" />

              {/* Card */}
              <div className="relative bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 text-center transition-all duration-300">
                {/* Icon */}
                <motion.div
                  variants={counterAnimation}
                  className={`
                    inline-flex items-center justify-center
                    w-12 h-12 md:w-14 md:h-14 rounded-xl mb-4
                    bg-gradient-to-br ${stat.color}
                    text-white shadow-lg
                  `}
                >
                  {stat.icon}
                </motion.div>

                {/* Value */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{
                    delay: 0.2 + index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="text-3xl md:text-4xl font-bold text-white mb-2"
                >
                  {stat.value}
                </motion.div>

                {/* Label */}
                <p className="text-sm md:text-base text-text-secondary">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={staggerItem}
              whileHover={testimonialHoverAnimation}
              className="group relative no-hover-mobile"
            >
              {/* Card */}
              <div className="relative h-full bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 transition-all duration-300">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 opacity-10 transition-opacity" aria-hidden="true">
                  <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4" role="img" aria-label={`${testimonial.rating} ${t.landing.socialProofRatingLabel}`}>
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Content */}
                <p className="text-text-secondary leading-relaxed mb-6 relative z-10">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    bg-gradient-to-br ${testimonial.gradient}
                    text-white font-semibold shadow-lg shrink-0
                  `}>
                    {testimonial.avatar}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white text-sm truncate">
                      {testimonial.name}
                    </h4>
                    <p className="text-xs text-text-muted truncate">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-12 md:mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-dark-card/50 border border-dark-border rounded-full">
            <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-text-secondary">
              <span className="text-white font-semibold">{t.landing.socialProofGdpr}</span> • {t.landing.socialProofSecureData} • {t.landing.socialProofSupport}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
