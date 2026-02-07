"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PlanType, getPlanConfig, getPlanLimits } from "@/lib/plans";

interface PromptLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  currentLength: number;
  maxLength: number;
}

/**
 * PromptLimitModal — Compact, iOS-inspired modal for character limit exceeded.
 *
 * Design principles:
 * - Typography-driven: character count as hero element
 * - Minimal decoration, no progress bars or icon blocks
 * - iOS bottom-sheet on mobile, centered on desktop
 * - Light backdrop, easy to dismiss
 * - Subtle upgrade CTA without being aggressive
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
    return null;
  };

  const upgradePlan = getUpgradePlan();
  const upgradePlanConfig = upgradePlan ? getPlanConfig(upgradePlan) : null;
  const upgradePlanLimits = upgradePlan ? getPlanLimits(upgradePlan) : null;

  const overLimit = currentLength - maxLength;

  const handleUpgrade = () => {
    onClose();
    router.push("/subscription");
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop — lighter than typical modals, iOS-style frosted glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[6px]"
            onClick={onClose}
          />

          {/* Modal — compact, clean, no visual noise */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 400,
              mass: 0.8,
            }}
            className="relative w-full max-w-[380px] mx-4 mb-3 sm:mb-0 bg-white dark:bg-dark-card rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden"
          >
            <div className="px-6 pt-7 pb-6">
              {/* Character count — hero element, prominent but elegant */}
              <div className="flex items-baseline justify-center gap-1.5 mb-5">
                <span className="text-[34px] font-bold text-amber-500 tabular-nums leading-none tracking-tight">
                  {currentLength.toLocaleString("fr-FR")}
                </span>
                <span className="text-base text-gray-400 dark:text-gray-500 font-medium">
                  / {maxLength.toLocaleString("fr-FR")}
                </span>
              </div>

              {/* Title — concise, warm */}
              <h2 className="text-[17px] font-semibold text-text-primary text-center mb-1.5">
                Votre message est trop long
              </h2>

              {/* Subtitle — actionable info in one sentence */}
              <p className="text-[13px] text-text-secondary text-center leading-relaxed mb-6">
                Raccourcissez de{" "}
                <strong className="text-amber-500 font-semibold">
                  {overLimit.toLocaleString("fr-FR")}
                </strong>{" "}
                caractères
                {upgradePlan && upgradePlanLimits && (
                  <>, ou passez au{" "}
                    <strong className="text-primary font-semibold">
                      {upgradePlanConfig?.name}
                    </strong>{" "}
                    pour{" "}
                    {upgradePlanLimits.maxCharactersPerPrompt.toLocaleString("fr-FR")} car.
                  </>
                )}
              </p>

              {/* CTAs — clean, two clear options */}
              <div className="space-y-2">
                {upgradePlan && upgradePlanConfig && (
                  <button
                    onClick={handleUpgrade}
                    className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white text-[15px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(248,147,93,0.3)] hover:shadow-[0_6px_20px_rgba(248,147,93,0.4)] active:scale-[0.98] transition-all duration-200"
                  >
                    Découvrir le plan {upgradePlanConfig.name}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-[14px] text-text-secondary hover:text-text-primary font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors duration-150"
                >
                  Modifier mon message
                </button>
              </div>
            </div>
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
