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
// FOUNDERS DATA - E-E-A-T: Authoritativeness
// =============================================================================
const foundersData = [
  {
    name: "Emilien Nepveu",
    role: "Co-Fondateur & CEO",
    linkedIn: "https://www.linkedin.com/in/e-nepveu-58a38127a/",
    initials: "EN",
    tagline: "Passionné par l'IA et le personal branding",
  },
  {
    name: "Côme Maubert",
    role: "Co-Fondateur & CFO",
    linkedIn: null as string | null,
    initials: "CM",
    tagline: "Financement et stratégie commerciale",
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Founder Badge - Display founders info for E-E-A-T authority
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
        {foundersData.map((founder, i) => (
          <span key={founder.initials} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-sm text-gray-400 dark:text-gray-500">&</span>}
            {founder.linkedIn ? (
              <a
                href={founder.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white
                  hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center text-[10px] font-bold text-white">
                  {founder.initials}
                </span>
                {founder.name}
                {showLinkedIn && <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center text-[10px] font-bold text-white">
                  {founder.initials}
                </span>
                {founder.name}
              </span>
            )}
          </span>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {foundersData.map((founder) => (
          <div key={founder.initials} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
              flex items-center justify-center">
              <span className="text-sm font-bold text-white">{founder.initials}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {founder.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {founder.role}
              </p>
            </div>
            {showLinkedIn && founder.linkedIn && (
              <a
                href={founder.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20
                  text-[#0A66C2] transition-colors"
                aria-label={`Voir le profil LinkedIn de ${founder.name}`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Card variant
  return (
    <div className={`bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200
      dark:border-white/10 ${className}`}>
      <div className="space-y-4">
        {foundersData.map((founder) => (
          <div key={founder.initials} className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
              flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">{founder.initials}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 dark:text-white">
                {founder.name}
              </h4>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                {founder.role}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {founder.tagline}
              </p>
            </div>
            {showLinkedIn && founder.linkedIn && (
              <a
                href={founder.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20
                  text-[#0A66C2] transition-colors flex-shrink-0"
                aria-label={`Voir le profil LinkedIn de ${founder.name}`}
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * About Link - Link to About page with founders info
 */
export function AboutLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/about"
      className={`inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400
        hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
    >
      <div className="flex -space-x-1">
        {foundersData.map((f) => (
          <span
            key={f.initials}
            className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
              flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white dark:ring-gray-900"
          >
            {f.initials}
          </span>
        ))}
      </div>
      <span>
        Créé par{" "}
        <span className="font-medium text-gray-900 dark:text-white">
          {foundersData.map((f) => f.name).join(" & ")}
        </span>
      </span>
    </Link>
  );
}

export default FounderBadge;
