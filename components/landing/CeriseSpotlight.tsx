"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { AmbientDecorations } from "@/components/landing/AmbientDecorations";

const premiumEase = [0.22, 1, 0.36, 1] as const;

/**
 * CeriseSpotlight — featured client testimonial card.
 * Designed to live INSIDE FeaturesSection (in `app/page.tsx`), so it inherits
 * `#features` padding/max-width and reads as a sibling of the other feature
 * cards. Uses the same envelope vocabulary as FeatureCard / HowItWorksSection
 * (warm orange gradient bg, border, rounded-clamp, padding-clamp).
 */
export default function CeriseSpotlight() {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-80px" });

  return (
    <div className="mt-[clamp(2rem,4vw,3.5rem)] mb-[clamp(1.25rem,2vw,1.75rem)]">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.6, ease: premiumEase }}
        className="relative px-[clamp(1.25rem,2.5vw,2.5rem)] py-[clamp(1.75rem,3vw,2.75rem)]"
      >
        {/* Ambient decorative motion — orbs + dots + a single drawn wave.
            Stays behind content (-z-[1]) and pointer-events-none. */}
        <AmbientDecorations variant={["orbs", "dots", "waves"]} intensity={0.85} />

        {/* Heading — same scale rhythm as the other feature card titles */}
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.1, ease: premiumEase }}
          className="
            text-center
            text-[clamp(1.35rem,2.4vw,2rem)]
            font-bold leading-[1.15] tracking-tight
            text-gray-900
            max-w-2xl mx-auto
            mb-[clamp(1.5rem,3vw,2.25rem)]
          "
        >
          {t.landing.ceriseSpotlightTitle1}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
            {t.landing.ceriseSpotlightTitle2}
          </span>
        </motion.h3>

        {/* Photo + Quote — generous editorial split */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)] gap-[clamp(1.5rem,3vw,2.75rem)] items-center max-w-4xl mx-auto">
          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={
              isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
            }
            transition={{ duration: 0.7, delay: 0.2, ease: premiumEase }}
            className="relative mx-auto lg:mx-0 w-44 sm:w-52 md:w-60 lg:w-64 aspect-square shrink-0"
          >
            <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-[0_18px_45px_-18px_rgba(247,107,84,0.35)] ring-1 ring-[#F8935D]/15">
              <Image
                src="/images/team/cerise-cottier.jpg"
                alt={t.landing.ceriseSpotlightImageAlt}
                fill
                sizes="(max-width: 1024px) 240px, 256px"
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* Quote + author */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.3, ease: premiumEase }}
          >
            <blockquote className="text-base md:text-lg lg:text-[1.25rem] leading-[1.6] text-gray-800 font-normal">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54] font-serif text-3xl leading-none align-text-top mr-1">
                &ldquo;
              </span>
              {t.landing.ceriseSpotlightQuote}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54] font-serif text-3xl leading-none align-text-top ml-1">
                &rdquo;
              </span>
            </blockquote>

            <div className="mt-6 md:mt-7 pt-4 md:pt-5 border-t border-gray-100">
              <p className="text-gray-900 font-semibold text-sm md:text-base">
                {t.landing.ceriseSpotlightName}
              </p>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                {t.landing.ceriseSpotlightRole}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
