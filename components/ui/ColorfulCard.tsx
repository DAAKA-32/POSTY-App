"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

// AUTOSCROLL COLORS - Cards dynamiques et attractives
type ColorVariant = "orange" | "rose" | "violet" | "jaune" | "vert" | "bleu";

interface ColorfulCardProps {
  children: ReactNode;
  variant: ColorVariant;
  className?: string;
  hoverable?: boolean;
  glowing?: boolean;
}

const colorConfig: Record<ColorVariant, {
  bg: string;
  border: string;
  glow: string;
  glowHover: string;
  gradient: string;
}> = {
  // ORANGE SAUMON: Couleur CTA principale (dominante)
  orange: {
    bg: "bg-gradient-to-br from-primary/5 via-orange-500/5 to-amber-500/5 dark:from-primary/10 dark:via-orange-500/10 dark:to-amber-500/10",
    border: "border-primary/20 hover:border-primary/40",
    glow: "shadow-[0_0_20px_rgba(248,147,93,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(248,147,93,0.25)]",
    gradient: "from-primary via-orange-500 to-amber-500",
  },

  // ROSE: Autoscroll color pour créativité/passion
  rose: {
    bg: "bg-gradient-to-br from-pink-500/5 via-rose-500/5 to-red-500/5 dark:from-pink-500/10 dark:via-rose-500/10 dark:to-red-500/10",
    border: "border-pink-500/20 hover:border-pink-500/40",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]",
    gradient: "from-pink-500 via-rose-500 to-red-500",
  },

  // VIOLET: Autoscroll color pour premium/influence
  violet: {
    bg: "bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:via-purple-500/10 dark:to-fuchsia-500/10",
    border: "border-violet-500/20 hover:border-violet-500/40",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
  },

  // JAUNE: Autoscroll color pour optimisme/énergie
  jaune: {
    bg: "bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-orange-400/5 dark:from-amber-500/10 dark:via-yellow-500/10 dark:to-orange-400/10",
    border: "border-amber-500/20 hover:border-amber-500/40",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]",
    gradient: "from-amber-500 via-yellow-500 to-orange-400",
  },

  // VERT: Autoscroll color pour croissance/succès
  vert: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:via-green-500/10 dark:to-teal-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    gradient: "from-emerald-500 via-green-500 to-teal-500",
  },

  // BLEU: Autoscroll color pour confiance/sérénité
  bleu: {
    bg: "bg-gradient-to-br from-blue-500/5 via-sky-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:via-sky-500/10 dark:to-cyan-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    glowHover: "hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]",
    gradient: "from-blue-500 via-sky-500 to-cyan-500",
  },
};

export default function ColorfulCard({
  children,
  variant,
  className = "",
  hoverable = true,
  glowing = false,
}: ColorfulCardProps) {
  const config = colorConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={hoverable ? { y: -4, scale: 1.01 } : {}}
      className={`
        relative overflow-hidden
        ${config.bg}
        border-2 ${config.border}
        rounded-2xl p-6
        transition-all duration-300
        ${glowing ? config.glow : ""}
        ${hoverable && glowing ? config.glowHover : ""}
        ${className}
      `}
    >
      {/* Gradient accent sur le top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />

      {/* Shimmer effect subtle au hover */}
      {hoverable && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`} />
        </div>
      )}

      {/* Contenu */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Export des variantes pour faciliter l'utilisation
export const ColorfulCardVariants = {
  orange: "orange" as const,
  rose: "rose" as const,
  violet: "violet" as const,
  jaune: "jaune" as const,
  vert: "vert" as const,
  bleu: "bleu" as const,
};
