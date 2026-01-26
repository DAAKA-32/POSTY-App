"use client";

import { Sparkles, Info, AlertCircle } from "lucide-react";
import { useState } from "react";

// =============================================================================
// TYPES
// =============================================================================
interface AIDisclaimerProps {
  variant?: "banner" | "inline" | "tooltip" | "modal";
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

// =============================================================================
// CONTENT - E-E-A-T: Transparency & Trust (French only)
// =============================================================================
const content = {
  title: "Contenu généré par IA",
  shortText: "Assisté par l'intelligence artificielle",
  mainText:
    "Les posts générés par POSTY sont des suggestions créées par l'intelligence artificielle. Nous vous recommandons de les personnaliser selon votre style et de les vérifier avant publication.",
  details: [
    "L'IA est un outil d'assistance, pas un remplacement de votre expertise",
    "Vérifiez toujours les faits et informations mentionnées",
    "Adaptez le ton et le contenu à votre audience",
    "Les résultats peuvent varier selon les prompts fournis",
  ],
  learnMore: "En savoir plus",
  dismiss: "Compris",
  capabilities: "Ce que l'IA fait bien :",
  capabilitiesList: [
    "Structurer vos idées en posts engageants",
    "Proposer des hooks et accroches efficaces",
    "Adapter le ton (storytelling vs business)",
    "Optimiser pour l'algorithme LinkedIn",
  ],
  limitations: "Limites à connaître :",
  limitationsList: [
    "Ne connaît pas votre contexte personnel",
    "Peut générer des informations à vérifier",
    "Ne remplace pas votre expertise métier",
    "Nécessite votre validation finale",
  ],
  transparency: "Transparence sur notre technologie",
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * AI Disclaimer Banner - Full width informational banner
 */
export function AIDisclaimerBanner({
  className = "",
  dismissible = true,
  onDismiss,
}: AIDisclaimerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20
        border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
            {content.title}
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            {content.mainText}
          </p>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900
              dark:hover:text-amber-200 transition-colors px-3 py-1.5 rounded-lg
              bg-amber-100 dark:bg-amber-800/30 hover:bg-amber-200 dark:hover:bg-amber-800/50"
          >
            {content.dismiss}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AI Disclaimer Inline - Small inline indicator
 */
export function AIDisclaimerInline({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <Sparkles className="w-3.5 h-3.5" />
      <span>{content.shortText}</span>
    </div>
  );
}

/**
 * AI Disclaimer Tooltip - Hover/click to reveal
 */
export function AIDisclaimerTooltip({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400
          hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-label={content.title}
      >
        <Info className="w-3.5 h-3.5" />
        <span className="sr-only">{content.title}</span>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3
            bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200
            dark:border-gray-700 z-50"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              {content.title}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {content.mainText}
          </p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-white dark:border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AI Disclaimer Detailed - Full disclosure with capabilities and limitations
 */
export function AIDisclaimerDetailed({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {content.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {content.transparency}
          </p>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        {content.mainText}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Capabilities */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {content.capabilities}
          </h4>
          <ul className="space-y-2">
            {content.capabilitiesList.map((item, index) => (
              <li key={index} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {content.limitations}
          </h4>
          <ul className="space-y-2">
            {content.limitationsList.map((item, index) => (
              <li key={index} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Generated Badge - Small badge for generated content
 */
export function AIGeneratedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
        bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400
        rounded-full ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      Généré par IA
    </span>
  );
}

export default AIDisclaimerBanner;
