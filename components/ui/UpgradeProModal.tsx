"use client";

import { motion, AnimatePresence } from "framer-motion";
import Modal from "./Modal";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import { useEffect, useState } from "react";

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  remaining?: number;
  resetsAt?: Date;
}

const PRO_FEATURES = [
  { icon: "\u267E\uFE0F", label: "Publications illimitees" },
  { icon: "\uD83D\uDCC8", label: "Statistiques avancees" },
  { icon: "\u2728", label: "Styles de posts exclusifs" },
  { icon: "\u26A1", label: "Generation prioritaire" },
  { icon: "\uD83D\uDCAC", label: "Support prioritaire" },
];

export default function UpgradeProModal({
  isOpen,
  onClose,
  remaining = 0,
  resetsAt,
}: UpgradeProModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Format reset time
  const formatResetTime = () => {
    if (!resetsAt) return "";
    const now = new Date();
    const diff = resetsAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "bientot";
  };

  const content = (
    <div className="text-center">
      {/* Header illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl"
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">\uD83D\uDE80</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">
        Passez a POSTY Pro
      </h2>

      {/* Subtitle */}
      <p className="text-text-secondary mb-6">
        {remaining === 0 ? (
          <>
            Vous avez atteint votre limite hebdomadaire.
            <br />
            <span className="text-sm">Renouvellement dans {formatResetTime()}</span>
          </>
        ) : (
          <>
            Il vous reste {remaining} publication{remaining > 1 ? "s" : ""} cette semaine.
            <br />
            Passez Pro pour publier sans limites !
          </>
        )}
      </p>

      {/* Features */}
      <div className="bg-dark-bg rounded-xl p-4 mb-6">
        <p className="text-xs text-text-muted uppercase tracking-wide mb-3 font-medium">
          Avantages Pro
        </p>
        <div className="space-y-3">
          {PRO_FEATURES.map((feature, index) => (
            <motion.div
              key={feature.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="text-xl">{feature.icon}</span>
              <span className="text-white text-sm">{feature.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-white">9,99</span>
          <span className="text-text-secondary">e/mois</span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Annulation a tout moment
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          fullWidth
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 border-none min-h-[52px] text-base font-semibold"
          onClick={() => {
            // TODO: Implement Stripe checkout
            alert("Integration Stripe a venir !");
          }}
        >
          <span className="mr-2">\u2728</span>
          Passer a Pro
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
