"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PlanType, getPlanConfig, getPlanLimits } from "@/lib/plans";
import Button from "@/components/ui/Button";

interface PromptLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  currentLength: number;
  maxLength: number;
}

/**
 * PromptLimitModal - Premium modal for prompt length limit exceeded
 *
 * Displays when user's prompt exceeds their plan's character limit.
 * Provides clear information and soft upgrade CTA without being aggressive.
 */
export default function PromptLimitModal({
  isOpen,
  onClose,
  currentPlan,
  currentLength,
  maxLength,
}: PromptLimitModalProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine upgrade target plan
  const getUpgradePlan = (): PlanType | null => {
    if (currentPlan === "free") return "pro";
    if (currentPlan === "pro") return "max";
    return null; // Max plan has no upgrade
  };

  const upgradePlan = getUpgradePlan();
  const upgradePlanConfig = upgradePlan ? getPlanConfig(upgradePlan) : null;
  const upgradePlanLimits = upgradePlan ? getPlanLimits(upgradePlan) : null;

  // Calculate how many characters are over the limit
  const overLimit = currentLength - maxLength;

  // Handle upgrade navigation
  const handleUpgrade = () => {
    onClose();
    router.push("/subscription");
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Don't render on server
  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-elevated overflow-hidden"
          >
            {/* Gradient top decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-xl hover:bg-light-hover dark:hover:bg-dark-hover"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500/20 to-primary/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-text-primary text-center mb-2">
                Limite de caractères atteinte
              </h2>

              {/* Current status */}
              <p className="text-text-secondary text-center mb-4">
                Votre message contient{" "}
                <span className="text-amber-500 font-semibold">{currentLength.toLocaleString("fr-FR")}</span>{" "}
                caractères.
              </p>

              {/* Progress bar visualization */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Limite {getPlanConfig(currentPlan).name}</span>
                  <span className="text-amber-500 font-medium">+{overLimit.toLocaleString("fr-FR")} caractères</span>
                </div>
                <div className="h-3 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((currentLength / maxLength) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>0</span>
                  <span>{maxLength.toLocaleString("fr-FR")} max</span>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-light-hover/50 dark:bg-dark-hover/50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-text-primary mb-3">Que puis-je faire ?</p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Raccourcir votre message de <strong className="text-text-primary">{overLimit}</strong> caractères</span>
                  </li>
                  {upgradePlan && upgradePlanLimits && (
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>
                        Passer au plan <strong className="text-text-primary">{upgradePlanConfig?.name}</strong> pour{" "}
                        <strong className="text-primary">{upgradePlanLimits.maxCharactersPerPrompt.toLocaleString("fr-FR")}</strong> caractères
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                {upgradePlan && upgradePlanConfig && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleUpgrade}
                    className="shadow-glow"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Passer au plan {upgradePlanConfig.name}
                    </span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={onClose}
                >
                  Modifier mon message
                </Button>
              </div>
            </div>

            {/* Footer note - only show if upgrade available */}
            {upgradePlan && (
              <div className="px-6 py-4 bg-light-hover/30 dark:bg-dark-hover/30 border-t border-light-border dark:border-dark-border">
                <p className="text-xs text-text-secondary text-center">
                  Essai gratuit de 7 jours disponible. Annulation possible à tout moment.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ============================================
// HOOK: usePromptLimitModal
// ============================================

interface UsePromptLimitModalOptions {
  currentPlan: PlanType;
  maxCharacters: number;
}

interface UsePromptLimitModalReturn {
  isOpen: boolean;
  openModal: (currentLength: number) => void;
  closeModal: () => void;
  checkAndProceed: (prompt: string, onSuccess: () => void) => boolean;
  ModalComponent: React.FC;
}

/**
 * Hook to manage prompt limit modal state and validation
 *
 * Usage:
 * ```tsx
 * const { checkAndProceed, ModalComponent } = usePromptLimitModal({
 *   currentPlan: "free",
 *   maxCharacters: 100,
 * });
 *
 * const handleSubmit = (message: string) => {
 *   checkAndProceed(message, () => {
 *     // Proceed with sending message
 *     sendMessage(message);
 *   });
 * };
 *
 * return (
 *   <>
 *     <ChatInput onSubmit={handleSubmit} />
 *     <ModalComponent />
 *   </>
 * );
 * ```
 */
export function usePromptLimitModal({
  currentPlan,
  maxCharacters,
}: UsePromptLimitModalOptions): UsePromptLimitModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLength, setCurrentLength] = useState(0);

  const openModal = useCallback((length: number) => {
    setCurrentLength(length);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Check if prompt is within limit and proceed if valid
   * Returns true if proceeding, false if blocked
   */
  const checkAndProceed = useCallback(
    (prompt: string, onSuccess: () => void): boolean => {
      const length = prompt.length;

      if (length > maxCharacters) {
        openModal(length);
        return false;
      }

      onSuccess();
      return true;
    },
    [maxCharacters, openModal]
  );

  // Create modal component with current state
  const ModalComponent = useCallback(() => (
    <PromptLimitModal
      isOpen={isOpen}
      onClose={closeModal}
      currentPlan={currentPlan}
      currentLength={currentLength}
      maxLength={maxCharacters}
    />
  ), [isOpen, closeModal, currentPlan, currentLength, maxCharacters]);

  return {
    isOpen,
    openModal,
    closeModal,
    checkAndProceed,
    ModalComponent,
  };
}
