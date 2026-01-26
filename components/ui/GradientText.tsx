"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

// ============================================================
// GRADIENT TEXT COMPONENT
// Texte avec gradient AUTOSCROLL pour titres importants
// ============================================================

export type GradientVariant =
  | "primary"      // Orange dominant
  | "orange-warm"  // Orange → Coral → Salmon
  | "premium"      // Violet → Purple
  | "success"      // Emerald → Green
  | "multicolor"   // Orange → Amber → Purple (full autoscroll)
  | "sunset"       // Orange → Pink → Purple
  | "ocean"        // Blue → Cyan → Teal
  | "forest"       // Green → Emerald → Teal;

export type GradientAnimation =
  | "none"         // Pas d'animation
  | "shimmer"      // Shimmer gauche-droite
  | "wave"         // Vague continue
  | "pulse";       // Pulse subtil

interface GradientTextProps {
  children: ReactNode;
  variant?: GradientVariant;
  animation?: GradientAnimation;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

// Gradient configurations - AUTOSCROLL colors
const gradientConfig: Record<GradientVariant, {
  gradient: string;
  animatedGradient?: string;
}> = {
  // ORANGE PRIMARY - CTA, titres principaux
  primary: {
    gradient: "from-primary via-orange-500 to-primary",
    animatedGradient: "from-primary via-orange-500 to-amber-500",
  },

  // ORANGE WARM - Titres chauds, accueillants
  "orange-warm": {
    gradient: "from-warm-orange via-warm-coral to-warm-salmon",
    animatedGradient: "from-warm-orange via-warm-coral to-warm-peach",
  },

  // VIOLET PREMIUM - Features premium, analytics
  premium: {
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    animatedGradient: "from-violet-400 via-purple-400 to-fuchsia-400",
  },

  // EMERALD SUCCESS - Success stories, achievements
  success: {
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    animatedGradient: "from-emerald-400 via-green-400 to-teal-400",
  },

  // MULTICOLOR - Titres très importants, hero sections
  multicolor: {
    gradient: "from-primary via-amber-500 to-purple-500",
    animatedGradient: "from-orange-500 via-pink-500 to-violet-500",
  },

  // SUNSET - Titres créatifs, storytelling
  sunset: {
    gradient: "from-orange-500 via-pink-500 to-purple-600",
    animatedGradient: "from-orange-400 via-pink-400 to-purple-500",
  },

  // OCEAN - Titres informatifs, trust
  ocean: {
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    animatedGradient: "from-blue-400 via-cyan-400 to-teal-400",
  },

  // FOREST - Titres nature, croissance
  forest: {
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    animatedGradient: "from-green-400 via-emerald-400 to-teal-500",
  },
};

// Animation configurations
const animationConfig: Record<GradientAnimation, {
  bgSize?: string;
  animate?: string;
  transition?: string;
}> = {
  none: {},

  shimmer: {
    bgSize: "bg-[length:200%_auto]",
    animate: "animate-shimmer-slow",
  },

  wave: {
    bgSize: "bg-[length:200%_auto]",
    animate: "animate-gradient-x",
  },

  pulse: {
    bgSize: "bg-[length:100%_auto]",
  },
};

export default function GradientText({
  children,
  variant = "primary",
  animation = "none",
  className = "",
  as: Component = "span",
}: GradientTextProps) {
  const config = gradientConfig[variant];
  const animConfig = animationConfig[animation];

  const gradientClasses = `
    bg-gradient-to-r ${config.gradient}
    ${animConfig.bgSize || ""}
    ${animConfig.animate || ""}
    bg-clip-text text-transparent
    ${className}
  `;

  // Pulse animation nécessite motion.div wrapper
  if (animation === "pulse") {
    return (
      <Component className={className}>
        <motion.span
          className={gradientClasses}
          animate={{
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {children}
        </motion.span>
      </Component>
    );
  }

  return (
    <Component className={gradientClasses}>
      {children}
    </Component>
  );
}

// ============================================================
// PRESET COMPONENTS - Usage simplifié
// ============================================================

// Hero Title - Orange dominant animé
export function HeroGradient({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <GradientText variant="primary" animation="shimmer" className={className}>
      {children}
    </GradientText>
  );
}

// Premium Title - Violet animé
export function PremiumGradient({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <GradientText variant="premium" animation="wave" className={className}>
      {children}
    </GradientText>
  );
}

// Success Title - Emerald
export function SuccessGradient({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <GradientText variant="success" animation="none" className={className}>
      {children}
    </GradientText>
  );
}

// Multicolor Title - Full autoscroll
export function AutoscrollGradient({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <GradientText variant="multicolor" animation="wave" className={className}>
      {children}
    </GradientText>
  );
}
