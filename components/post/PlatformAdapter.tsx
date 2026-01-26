"use client";

import { useState } from "react";
import { AdaptationPlatform, PlatformAdaptation } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface PlatformAdapterProps {
  postContent: string;
  onAdapt?: (adaptation: PlatformAdaptation) => void;
  className?: string;
}

const PLATFORMS: { id: AdaptationPlatform; icon: string; label: string }[] = [
  { id: "instagram", icon: "📸", label: "Instagram" },
  { id: "twitter", icon: "𝕏", label: "Twitter/X" },
  { id: "facebook", icon: "📘", label: "Facebook" },
];

/**
 * PlatformAdapter Component
 * Allows MAX plan users to adapt their LinkedIn post to other platforms
 */
export function PlatformAdapter({
  postContent,
  onAdapt,
  className = "",
}: PlatformAdapterProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<AdaptationPlatform | null>(null);
  const [adaptation, setAdaptation] = useState<PlatformAdaptation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { language } = useLanguage();
  const { user } = useAuth();

  const labels = {
    fr: {
      title: "Adapter pour d'autres plateformes",
      adapt: "Adapter",
      adapting: "Adaptation...",
      copy: "Copier",
      copied: "Copie!",
      characters: "caracteres",
      hashtags: "Hashtags suggeres",
      tips: "Conseils",
      tryAnother: "Essayer une autre",
      error: "Erreur lors de l'adaptation",
    },
    en: {
      title: "Adapt for other platforms",
      adapt: "Adapt",
      adapting: "Adapting...",
      copy: "Copy",
      copied: "Copied!",
      characters: "characters",
      hashtags: "Suggested hashtags",
      tips: "Tips",
      tryAnother: "Try another",
      error: "Error during adaptation",
    },
  };

  const t = labels[language] || labels.fr;

  const handleAdapt = async (platform: AdaptationPlatform) => {
    if (!user?.uid) return;

    setSelectedPlatform(platform);
    setLoading(true);
    setError(null);
    setAdaptation(null);

    try {
      const response = await fetch("/api/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          postContent,
          platform,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || t.error);
      }

      setAdaptation(data.adaptation);
      onAdapt?.(data.adaptation);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!adaptation?.content) return;

    try {
      await navigator.clipboard.writeText(adaptation.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReset = () => {
    setSelectedPlatform(null);
    setAdaptation(null);
    setError(null);
  };

  return (
    <div
      className={`rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-emerald-200 px-4 py-3 dark:border-emerald-800">
        <span className="text-lg">🌐</span>
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          {t.title}
        </span>
        <span className="ml-auto rounded bg-emerald-200 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300">
          MAX
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {!adaptation && !loading && (
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleAdapt(platform.id)}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-900/30"
              >
                <span>{platform.icon}</span>
                {platform.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{t.adapting}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {adaptation && (
          <div className="space-y-4">
            {/* Platform badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {PLATFORMS.find((p) => p.id === adaptation.platform)?.icon}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {PLATFORMS.find((p) => p.id === adaptation.platform)?.label}
              </span>
              <span className="ml-auto text-xs text-gray-500">
                {adaptation.characterCount} {t.characters}
              </span>
            </div>

            {/* Adapted content */}
            <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {adaptation.content}
              </p>
            </div>

            {/* Hashtags */}
            {adaptation.hashtags.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t.hashtags}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {adaptation.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {adaptation.notes && (
              <div className="rounded-lg bg-emerald-100/50 p-3 dark:bg-emerald-900/20">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  💡 {t.tips}:
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {adaptation.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                {copied ? t.copied : t.copy}
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                {t.tryAnother}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlatformAdapter;
