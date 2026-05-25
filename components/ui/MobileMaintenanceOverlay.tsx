"use client";

import { motion } from "framer-motion";

/**
 * MobileMaintenanceOverlay — Full-screen blocker shown on mobile only
 * while the mobile UI is being finalized. Prevents any navigation /
 * interaction with the app behind it.
 *
 * Hidden at the `lg` breakpoint (>= 1024px) so desktop is unaffected.
 */
export default function MobileMaintenanceOverlay() {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-maintenance-title"
      aria-describedby="mobile-maintenance-desc"
      className="lg:hidden fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Solid backdrop — fully opaque so nothing below is reachable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[#FAFBFC] via-[#FFF4EC] to-[#FFE4D2] dark:from-[#0B0E11] dark:via-[#1A0F0A] dark:to-[#2A1408]"
      />

      {/* Soft radial halo for warmth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(248,147,93,0.35) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm rounded-3xl bg-white/85 dark:bg-white/[0.06]
          backdrop-blur-2xl backdrop-saturate-150
          border border-white/60 dark:border-white/15
          ring-1 ring-inset ring-white/40 dark:ring-white/10
          shadow-[0_20px_60px_rgba(15,17,21,0.18),0_4px_16px_rgba(15,17,21,0.10)]
          px-7 py-8 text-center"
      >
        {/* Logo */}
        <div className="relative mx-auto mb-5 w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-1 ring-white/60 dark:ring-white/20">
          <div className="absolute -inset-1 bg-gradient-to-br from-[#F8935D] to-[#F76B54] opacity-30 blur-md" />
          <img
            src="/logo.png"
            alt="Posty"
            className="relative w-full h-full object-contain"
          />
        </div>

        {/* Animated spinner ring */}
        <div className="mx-auto mb-6 w-10 h-10 relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[3px] border-[#F8935D]/20 border-t-[#F8935D]"
          />
        </div>

        <h2
          id="mobile-maintenance-title"
          className="text-[19px] font-bold tracking-tight text-gray-900 dark:text-white mb-2"
        >
          Maintenance en cours
        </h2>
        <p
          id="mobile-maintenance-desc"
          className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300"
        >
          Veuillez attendre quelques instants, nous finalisons l&apos;expérience
          mobile de Posty.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#F8935D]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F8935D] animate-pulse" />
          Posty Team
        </div>
      </motion.div>
    </div>
  );
}
