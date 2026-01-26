"use client";

import { motion } from "framer-motion";

// ============================================================
// COLORFUL LOADER - AUTOSCROLL COLORS
// Loading states avec palette de couleurs sémantiques
// ============================================================

export type LoaderVariant =
  | "primary"    // Orange - Actions principales
  | "success"    // Emerald - Opérations réussies
  | "warning"    // Amber - Avertissements
  | "error"      // Red - Erreurs
  | "info"       // Blue - Informations
  | "premium"    // Violet - Actions premium
  | "neutral";   // Gris - Neutre

export type LoaderSize = "sm" | "md" | "lg" | "xl";

interface ColorfulLoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  text?: string;
  className?: string;
  showPulse?: boolean;
}

// Size mapping
const sizeConfig = {
  sm: {
    spinner: "w-4 h-4 border-2",
    dot: "w-1.5 h-1.5",
    text: "text-xs",
    gap: "gap-2",
  },
  md: {
    spinner: "w-8 h-8 border-2",
    dot: "w-2 h-2",
    text: "text-sm",
    gap: "gap-3",
  },
  lg: {
    spinner: "w-12 h-12 border-4",
    dot: "w-3 h-3",
    text: "text-base",
    gap: "gap-4",
  },
  xl: {
    spinner: "w-16 h-16 border-4",
    dot: "w-4 h-4",
    text: "text-lg",
    gap: "gap-5",
  },
};

// Color config - AUTOSCROLL colors
const colorConfig: Record<LoaderVariant, {
  border: string;
  borderTop: string;
  text: string;
  glow: string;
  dots: string[];
}> = {
  // ORANGE PRIMARY - Actions principales, génération en cours
  primary: {
    border: "border-primary/20",
    borderTop: "border-t-primary",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(248,147,93,0.3)]",
    dots: [
      "bg-primary",
      "bg-orange-500",
      "bg-amber-500",
    ],
  },

  // EMERALD SUCCESS - Opérations réussies en cours
  success: {
    border: "border-emerald-500/20",
    borderTop: "border-t-emerald-500",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    dots: [
      "bg-emerald-500",
      "bg-green-500",
      "bg-teal-500",
    ],
  },

  // AMBER WARNING - Traitements qui prennent du temps
  warning: {
    border: "border-amber-500/20",
    borderTop: "border-t-amber-500",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    dots: [
      "bg-amber-500",
      "bg-yellow-500",
      "bg-orange-400",
    ],
  },

  // RED ERROR - Opérations en erreur (retry)
  error: {
    border: "border-red-500/20",
    borderTop: "border-t-red-500",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    dots: [
      "bg-red-500",
      "bg-rose-500",
      "bg-pink-500",
    ],
  },

  // BLUE INFO - Chargement données
  info: {
    border: "border-blue-500/20",
    borderTop: "border-t-blue-500",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    dots: [
      "bg-blue-500",
      "bg-sky-500",
      "bg-cyan-500",
    ],
  },

  // VIOLET PREMIUM - Actions premium, insights
  premium: {
    border: "border-violet-500/20",
    borderTop: "border-t-violet-500",
    text: "text-text-secondary",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.3)]",
    dots: [
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
    ],
  },

  // NEUTRAL - Chargement général
  neutral: {
    border: "border-gray-300 dark:border-dark-border",
    borderTop: "border-t-gray-900 dark:border-t-white",
    text: "text-text-muted",
    glow: "",
    dots: [
      "bg-gray-400 dark:bg-gray-600",
      "bg-gray-500 dark:bg-gray-500",
      "bg-gray-600 dark:bg-gray-400",
    ],
  },
};

export default function ColorfulLoader({
  variant = "primary",
  size = "md",
  text,
  className = "",
  showPulse = true,
}: ColorfulLoaderProps) {
  const colors = colorConfig[variant];
  const sizes = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${sizes.gap} ${className}`}>
      {/* Spinner avec glow */}
      <div className="relative">
        {/* Glow effect */}
        {showPulse && variant !== "neutral" && (
          <motion.div
            className={`absolute inset-0 rounded-full ${colors.glow}`}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Spinner */}
        <motion.div
          className={`
            ${sizes.spinner}
            rounded-full
            border ${colors.border}
            ${colors.borderTop}
            relative
          `}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Optional text */}
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`${sizes.text} ${colors.text} font-medium text-center`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// ============================================================
// DOTS LOADER - Alternative avec points animés
// ============================================================

interface DotsLoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  text?: string;
  className?: string;
}

export function DotsLoader({
  variant = "primary",
  size = "md",
  text,
  className = "",
}: DotsLoaderProps) {
  const colors = colorConfig[variant];
  const sizes = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${sizes.gap} ${className}`}>
      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {colors.dots.map((dotColor, index) => (
          <motion.div
            key={index}
            className={`${sizes.dot} rounded-full ${dotColor}`}
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.15,
            }}
          />
        ))}
      </div>

      {/* Optional text */}
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`${sizes.text} ${colors.text} font-medium text-center`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// ============================================================
// PULSE LOADER - Alternative avec pulse
// ============================================================

interface PulseLoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  className?: string;
}

export function PulseLoader({
  variant = "primary",
  size = "md",
  className = "",
}: PulseLoaderProps) {
  const colors = colorConfig[variant];
  const sizes = sizeConfig[size];

  return (
    <div className={`relative ${className}`}>
      {/* Outer pulse */}
      <motion.div
        className={`
          absolute inset-0
          ${sizes.spinner}
          rounded-full
          ${colors.dots[0]}
          opacity-20
        `}
        animate={{
          scale: [1, 1.5],
          opacity: [0.2, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      {/* Middle pulse */}
      <motion.div
        className={`
          absolute inset-0
          ${sizes.spinner}
          rounded-full
          ${colors.dots[1]}
          opacity-30
        `}
        animate={{
          scale: [1, 1.3],
          opacity: [0.3, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.3,
        }}
      />

      {/* Inner dot */}
      <div className={`
        ${sizes.spinner}
        rounded-full
        ${colors.dots[2]}
      `} />
    </div>
  );
}

// ============================================================
// INLINE LOADER - Petit loader inline dans boutons
// ============================================================

interface InlineLoaderProps {
  variant?: LoaderVariant;
  className?: string;
}

export function InlineLoader({
  variant = "primary",
  className = "",
}: InlineLoaderProps) {
  const colors = colorConfig[variant];

  return (
    <motion.svg
      className={`w-4 h-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <circle
        className={colors.border}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </motion.svg>
  );
}
