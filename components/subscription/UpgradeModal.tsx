"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuota } from "@/contexts/QuotaContext";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { getPlanConfig, getPlanCoreFeatures, GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";
import Button from "@/components/ui/Button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();
  useScrollLock(isOpen);
  const { currentPlan, dailyLimit, messagesUsedToday, resetsAt } = useQuota();

  const proPlan = getPlanConfig("pro");
  const proFeatures = getPlanCoreFeatures(proPlan);

  // Format reset time
  const formatResetTime = () => {
    if (!resetsAt) return "demain";
    const now = new Date();
    const diff = resetsAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} minutes`;
  };

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-elevated overflow-hidden"
          >
            {/* Gradient top decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white transition-colors rounded-xl hover:bg-dark-hover"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Limite quotidienne atteinte
              </h2>

              {/* Usage info */}
              <p className="text-text-secondary text-center mb-6">
                Vous avez utilisé <span className="text-white font-medium">{messagesUsedToday}/{dailyLimit}</span> messages aujourd'hui.
                <br />
                Votre quota se réinitialise dans <span className="text-primary font-medium">{formatResetTime()}</span>.
              </p>

              {/* Upgrade benefits */}
              <div className="bg-dark-hover/50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-white mb-3">Passez à Pro pour débloquer :</p>
                <ul className="space-y-2">
                  {proFeatures
                    .filter((f) => f.included)
                    .slice(0, 3)
                    .map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-text-secondary">
                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {feature.text}
                      </li>
                    ))}
                </ul>
              </div>

              {/* Price highlight */}
              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-white">{proPlan.price.monthly.toFixed(2).replace(".", ",")}€</span>
                <span className="text-text-secondary">/mois</span>
              </div>

              {/* CTA buttons — `premium` variant inherits the signature posts
                  gradient (violet → rose → coral) so the upgrade CTA pops
                  visually while staying within the Posty DA. */}
              <div className="space-y-3">
                <Button variant="premium" fullWidth onClick={handleUpgrade}>
                  Passer à Pro
                </Button>
                <Button variant="ghost" fullWidth onClick={onClose}>
                  Attendre demain
                </Button>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-6 py-4 bg-dark-hover/30 border-t border-dark-border">
              <p className="text-xs text-text-secondary text-center">
                Annulation possible à tout moment. Satisfait ou remboursé {GUARANTEE_PERIOD_DAYS} jours.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage upgrade modal state
import { useState, useCallback, useEffect } from "react";

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { canSendMessage, dailyLimit, currentPlan } = useQuota();

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Check quota before sending message
  const checkQuotaAndProceed = useCallback(
    (onSuccess: () => void) => {
      if (!canSendMessage && !currentPlan) {
        openModal();
        return false;
      }
      onSuccess();
      return true;
    },
    [canSendMessage, currentPlan, openModal]
  );

  return {
    isOpen,
    openModal,
    closeModal,
    checkQuotaAndProceed,
    shouldShowUpgrade: !canSendMessage && !currentPlan,
  };
}
