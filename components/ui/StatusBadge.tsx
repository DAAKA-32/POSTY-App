"use client";

import { ReactNode } from "react";

type BadgeVariant = "vip" | "verified" | "creator" | "influencer" | "pro";

interface StatusBadgeProps {
  variant: BadgeVariant;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// AUTOSCROLL COLORS - Badges renforcés avec palette complète
const badgeConfig: Record<BadgeVariant, { icon: ReactNode; label: string; colors: string; glow: string }> = {
  vip: {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
    label: "VIP",
    // JAUNE: Couleur autoscroll pour éléments premium
    colors: "from-amber-400 via-amber-500 to-orange-500 text-white",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.5)]",
  },
  verified: {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    label: "Vérifié",
    // BLEU: Couleur autoscroll pour vérification/confiance
    colors: "from-blue-500 via-blue-600 to-cyan-500 text-white",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.5)]",
  },
  creator: {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    label: "Createur",
    // ROSE/ROUGE: Couleur autoscroll pour créativité
    colors: "from-pink-500 via-rose-500 to-red-500 text-white",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.5)]",
  },
  influencer: {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    label: "Influenceur",
    // VIOLET: Couleur autoscroll pour influence/premium
    colors: "from-violet-500 via-purple-500 to-fuchsia-500 text-white",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.5)]",
  },
  pro: {
    icon: (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 17.25l-.259 1.035a3.375 3.375 0 01-2.456 2.456L12.75 21l1.035.259a3.375 3.375 0 012.456 2.456l.259 1.035.259-1.035a3.375 3.375 0 012.456-2.456L20.25 21l-1.035-.259a3.375 3.375 0 01-2.456-2.456l-.259-1.035z" />
      </svg>
    ),
    label: "Pro",
    // ORANGE SAUMON: Couleur dominante CTA principale
    colors: "from-primary via-orange-500 to-accent text-white",
    glow: "shadow-[0_0_24px_rgba(248,147,93,0.6)]",
  },
};

const sizeStyles = {
  xs: { badge: "w-4 h-4 p-0.5", icon: "w-2.5 h-2.5", text: "text-[8px]" },
  sm: { badge: "w-5 h-5 p-1", icon: "w-3 h-3", text: "text-[10px]" },
  md: { badge: "w-7 h-7 p-1.5", icon: "w-4 h-4", text: "text-xs" },
  lg: { badge: "w-9 h-9 p-2", icon: "w-5 h-5", text: "text-sm" },
};

export default function StatusBadge({
  variant,
  size = "md",
  showLabel = false,
  className = "",
}: StatusBadgeProps) {
  const config = badgeConfig[variant];
  const sizes = sizeStyles[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className={`
          ${sizes.badge}
          rounded-full bg-gradient-to-br ${config.colors}
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 hover:brightness-110
          ${config.glow}
        `}
      >
        <span className={sizes.icon}>{config.icon}</span>
      </div>
      {showLabel && (
        <span className={`font-medium ${sizes.text} text-text-secondary`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Inline badge for text
export function InlineBadge({ variant, className = "" }: { variant: BadgeVariant; className?: string }) {
  const config = badgeConfig[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5
        rounded-md bg-gradient-to-r ${config.colors}
        text-[10px] font-semibold uppercase tracking-wide
        transition-all duration-200
        hover:brightness-110
        ${className}
      `}
    >
      <span className="w-2.5 h-2.5">{config.icon}</span>
      {config.label}
    </span>
  );
}
