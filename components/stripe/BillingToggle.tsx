"use client";

import { motion } from "framer-motion";

interface BillingToggleProps {
  isYearly: boolean;
  onToggle: (isYearly: boolean) => void;
  savings?: number;
}

export default function BillingToggle({
  isYearly,
  onToggle,
  savings = 17,
}: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className={`text-sm font-medium transition-colors ${
        !isYearly ? "text-white" : "text-text-muted"
      }`}>
        Mensuel
      </span>

      <button
        onClick={() => onToggle(!isYearly)}
        className={`
          relative w-14 h-7 rounded-full
          transition-colors duration-300
          ${isYearly ? "bg-primary" : "bg-dark-border"}
        `}
        aria-label={isYearly ? "Passer au paiement mensuel" : "Passer au paiement annuel"}
      >
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
          animate={{
            x: isYearly ? 28 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      </button>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium transition-colors ${
          isYearly ? "text-white" : "text-text-muted"
        }`}>
          Annuel
        </span>
        {savings > 0 && (
          <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded-full">
            -{savings}%
          </span>
        )}
      </div>
    </div>
  );
}
