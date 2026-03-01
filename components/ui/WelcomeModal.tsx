"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useScrollLock } from "@/hooks/useScrollLock";

interface WelcomeModalProps {
  isOpen: boolean;
  planName?: string;
  /** Redirect target after display (default: /app) */
  redirectTo?: string;
  /** Delay in ms before auto-redirect (default: 3500) */
  redirectDelay?: number;
}

const REDIRECT_DELAY = 3500;

export default function WelcomeModal({
  isOpen,
  planName,
  redirectTo = "/app",
  redirectDelay = REDIRECT_DELAY,
}: WelcomeModalProps) {
  const router = useRouter();
  useScrollLock(isOpen);
  const [isMounted, setIsMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Confetti on open
  useEffect(() => {
    if (!isOpen) return;

    const duration = 2500;
    const end = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) { clearInterval(interval); return; }
      const count = 40 * (timeLeft / duration);
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 }, colors: ["#F8A35D", "#F85751", "#FAB9AD", "#EC254D"] });
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 }, colors: ["#F8A35D", "#F85751", "#FAB9AD", "#EC254D"] });
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Progress bar + auto-redirect
  useEffect(() => {
    if (!isOpen) return;

    const startTime = Date.now();
    const frame = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / redirectDelay, 1);
      setProgress(pct);
      if (pct < 1) requestAnimationFrame(frame);
    };
    const raf = requestAnimationFrame(frame);

    const timer = setTimeout(() => {
      router.replace(redirectTo);
    }, redirectDelay);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [isOpen, redirectDelay, redirectTo, router]);

  const handleGoNow = useCallback(() => {
    router.replace(redirectTo);
  }, [router, redirectTo]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ minHeight: "100dvh" }}>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 260, mass: 0.6 }}
          >
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="px-6 pt-8 pb-6 text-center">
              {/* Animated checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
              >
                <motion.svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                  />
                </motion.svg>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2"
              >
                {planName
                  ? `Bienvenue dans ${planName} !`
                  : "Bienvenue sur Posty !"
                }
              </motion.h2>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-sm sm:text-base text-gray-600 dark:text-text-secondary mb-6 leading-relaxed"
              >
                L&apos;equipe Posty vous remercie pour votre confiance !<br />
                <span className="text-primary font-medium">Votre espace est pret.</span>
              </motion.p>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onClick={handleGoNow}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow text-sm sm:text-base"
              >
                Commencer
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.button>

              {/* Auto-redirect indicator */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="mt-4 text-xs text-gray-400 dark:text-text-muted"
              >
                Redirection automatique...
              </motion.p>
            </div>

            {/* Progress bar at bottom */}
            <div className="h-1 bg-gray-100 dark:bg-dark-border">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
