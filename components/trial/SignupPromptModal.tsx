"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollLock } from "@/hooks/useScrollLock";

interface SignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  delayMs?: number;
}

export default function SignupPromptModal({
  isOpen,
  onClose,
  delayMs = 3000,
}: SignupPromptModalProps) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);

  // Delay before showing the modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, delayMs);
      return () => clearTimeout(timer);
    } else {
      setShowModal(false);
    }
  }, [isOpen, delayMs]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (showModal) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showModal, onClose]);

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal - Mobile: full screen bottom, Desktop: centered */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className="
              fixed z-50
              inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2
              md:-translate-x-1/2 md:-translate-y-1/2
              w-full md:max-w-lg
              max-h-[90vh] overflow-y-auto
            "
          >
            <div className="bg-dark-card border-t md:border border-dark-border rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
              {/* Close button - Mobile drag indicator / Desktop X */}
              <div className="md:hidden flex justify-center py-3">
                <div className="w-12 h-1.5 bg-dark-border rounded-full" />
              </div>
              <button
                onClick={onClose}
                className="hidden md:flex absolute top-4 right-4 w-8 h-8 items-center justify-center text-text-muted hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>

              {/* Content */}
              <div className="px-6 py-6 md:py-8 text-center">
                {/* Success icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl md:text-2xl font-bold text-white mb-2"
                >
                  Vous aimez ce que vous venez de créer ?
                </motion.h3>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-text-secondary mb-6 max-w-sm mx-auto"
                >
                  Créez un compte pour retrouver vos posts et accéder à tout Posty.
                </motion.p>

                {/* Features list */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-dark-bg/50 rounded-xl p-4 mb-6"
                >
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { icon: "M5 13l4 4L19 7", text: "Vos posts sauvegardés" },
                      { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "Historique complet" },
                      { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", text: "Notifications" },
                      { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "Génération en quelques secondes" },
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                          </svg>
                        </div>
                        <span className="text-xs text-text-secondary">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="
                      block w-full py-4 px-6
                      bg-primary hover:bg-primary-hover
                      text-white font-semibold text-base rounded-xl
                      shadow-sm hover:shadow-md
                      transition-colors duration-200
                    "
                  >
                    Créer mon compte
                  </Link>

                  <button
                    onClick={onClose}
                    className="
                      w-full py-3 px-6
                      bg-dark-elevated hover:bg-dark-hover
                      border border-dark-border
                      text-text-secondary hover:text-white
                      font-medium text-sm rounded-xl
                      transition-colors duration-200
                    "
                  >
                    Pas maintenant
                  </button>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center gap-4 mt-6 pt-4 border-t border-dark-border/30"
                >
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Gratuit pour commencer
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Données sécurisées
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
