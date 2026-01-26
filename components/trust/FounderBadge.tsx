"use client";

import { Linkedin } from "lucide-react";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================
interface FounderBadgeProps {
  variant?: "compact" | "card" | "inline";
  className?: string;
  showLinkedIn?: boolean;
}

// =============================================================================
// FOUNDER DATA - E-E-A-T: Authoritativeness
// =============================================================================
const founderData = {
  name: "Emilien Nepveu",
  role: "Fondateur & CEO",
  linkedIn: "https://www.linkedin.com/in/e-nepveu-58a38127a/",
  initials: "EN",
  tagline: "Passionné par l'IA et le personal branding",
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Founder Badge - Display founder info for E-E-A-T authority
 */
export function FounderBadge({
  variant = "compact",
  className = "",
  showLinkedIn = true,
}: FounderBadgeProps) {
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Créé par
        </span>
        <a
          href={founderData.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white
            hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center text-[10px] font-bold text-white">
            {founderData.initials}
          </span>
          {founderData.name}
          {showLinkedIn && <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />}
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
          flex items-center justify-center">
          <span className="text-sm font-bold text-white">{founderData.initials}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {founderData.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {founderData.role}
          </p>
        </div>
        {showLinkedIn && (
          <a
            href={founderData.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto p-2 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20
              text-[#0A66C2] transition-colors"
            aria-label={`Voir le profil LinkedIn de ${founderData.name}`}
          >
            <Linkedin className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  // Card variant
  return (
    <div className={`bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200
      dark:border-white/10 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
          flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">{founderData.initials}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 dark:text-white">
            {founderData.name}
          </h4>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            {founderData.role}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {founderData.tagline}
          </p>
        </div>
      </div>
      {showLinkedIn && (
        <a
          href={founderData.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
            bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-medium transition-colors"
        >
          <Linkedin className="w-4 h-4" />
          Voir sur LinkedIn
        </a>
      )}
    </div>
  );
}

/**
 * About Link - Link to About page with founder info
 */
export function AboutLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/about"
      className={`inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400
        hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
    >
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
        flex items-center justify-center text-[10px] font-bold text-white">
        {founderData.initials}
      </span>
      <span>
        Créé par{" "}
        <span className="font-medium text-gray-900 dark:text-white">
          {founderData.name}
        </span>
      </span>
    </Link>
  );
}

export default FounderBadge;
