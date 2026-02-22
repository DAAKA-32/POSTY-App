"use client";

import { useRouter } from "next/navigation";
import Modal from "./Modal";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import { useEffect, useState } from "react";
import { getPlanConfig, getPlanCoreFeatures } from "@/lib/plans";
import { SubscriptionPlan } from "@/types";

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  remaining?: number;
  resetsAt?: Date;
  currentPlan?: SubscriptionPlan | null;
}

export default function UpgradeProModal({
  isOpen,
  onClose,
  remaining = 0,
  resetsAt,
  currentPlan,
}: UpgradeProModalProps) {
  const router = useRouter();

  // SSR-safe mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

  // Max plan users should never see this modal — auto-close if it somehow opens
  useEffect(() => {
    if (isOpen && currentPlan === "max") {
      onClose();
    }
  }, [isOpen, currentPlan, onClose]);

  // Determine which plan to suggest
  const targetPlan = currentPlan === "pro" ? "max" : "pro";
  const planConfig = getPlanConfig(targetPlan);
  const features = getPlanCoreFeatures(planConfig).filter((f) => f.included).slice(0, 5);
  const price = planConfig.price.monthly.toFixed(2).replace(".", ",");

  // Format reset time
  const formatResetTime = () => {
    if (!resetsAt) return "";
    const now = new Date();
    const diff = resetsAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "bientôt";
  };

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  // Don't render for Max users
  if (currentPlan === "max") return null;

  const content = (
    <div className="text-center">
      {/* Header illustration */}
      <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
        <span className="text-4xl">{"\uD83D\uDE80"}</span>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">
        Passez à POSTY {planConfig.displayName}
      </h2>

      {/* Subtitle */}
      <p className="text-text-secondary mb-6">
        {remaining === 0 ? (
          <>
            Vous avez atteint votre limite quotidienne.
            <br />
            <span className="text-sm">Renouvellement dans {formatResetTime()}</span>
          </>
        ) : (
          <>
            Il vous reste {remaining} publication{remaining > 1 ? "s" : ""} aujourd&apos;hui.
            <br />
            Passez {planConfig.displayName} pour publier sans limites !
          </>
        )}
      </p>

      {/* Features */}
      <div className="bg-dark-bg rounded-xl p-4 mb-6">
        <p className="text-xs text-text-muted uppercase tracking-wide mb-3 font-medium">
          Avantages {planConfig.displayName}
        </p>
        <div className="space-y-3">
          {features.map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-sm">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          <span className="text-text-secondary">&euro;/mois</span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Annulation à tout moment
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          fullWidth
          className="bg-primary hover:bg-primary-hover border-none min-h-[52px] text-base font-semibold"
          onClick={handleUpgrade}
        >
          Passer à {planConfig.displayName}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={onClose}
          className="min-h-[44px]"
        >
          Plus tard
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        showCloseButton={false}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} size="sm">
      {content}
    </Modal>
  );
}
