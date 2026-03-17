"use client";

import { motion } from "framer-motion";
import { GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";
import { useLanguage } from "@/contexts/LanguageContext";

interface PricingTrustBadgesProps {
  className?: string;
}

export default function PricingTrustBadges({ className = "" }: PricingTrustBadgesProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 }}
      className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-gray-500 dark:text-gray-400 text-xs sm:text-sm ${className}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        {t.landing.pricingBadgeSecure}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {t.landing.pricingBadgeNoCommitment}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
        {t.landing.pricingBadgeSupport}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {t.landing.pricingBadgeGuarantee.replace("{days}", String(GUARANTEE_PERIOD_DAYS))}
      </div>
    </motion.div>
  );
}
