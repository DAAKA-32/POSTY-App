"use client";

import { Platform } from "@/types";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanType } from "@/lib/config/plans";
import { canUsePlatform, canPublishSimultaneously } from "@/lib/config/permissions";
import Link from "next/link";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "@/components/ui/Toast";
import { PLATFORMS } from "./platforms-config";

// Plan badge component
function PlanBadge({ plan }: { plan: PlanType }) {
  const colors: Record<string, string> = {
    pro: "bg-primary/20 text-primary",
    max: "bg-accent/20 text-accent",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${colors[plan] || "bg-text-muted/20 text-text-muted"}`}>
      {plan.toUpperCase()}
    </span>
  );
}

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  connectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
  /** Show all platforms including locked ones */
  showAllPlatforms?: boolean;
  /** Called when the user clicks a platform that the user has plan access to but
   *  hasn't connected yet. Parent should open a connect popup. If omitted,
   *  falls back to the legacy toast hint. */
  onConnectRequest?: (platform: Platform) => void;
}

export default function PlatformSelector({
  selectedPlatforms,
  connectedPlatforms,
  onToggle,
  showAllPlatforms = true,
  onConnectRequest,
}: PlatformSelectorProps) {
  const { t } = useLanguage();
  const { subscription, currentPlan } = useSubscription();

  // Check if user can publish to multiple platforms simultaneously
  const canMultiPublish = canPublishSimultaneously(subscription);

  // Filter platforms based on showAllPlatforms prop
  const visiblePlatforms = showAllPlatforms
    ? PLATFORMS
    : PLATFORMS.filter((p) => canUsePlatform(subscription, p.id).allowed);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
          {t.publish.publishOnLabel}
        </p>
        {selectedPlatforms.length > 1 && !canMultiPublish.allowed && (
          <span className="text-[10px] text-warning">
            {t.publish.simultaneousPublish} <PlanBadge plan="max" />
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {visiblePlatforms.map((platform) => {
          const hasAccess = canUsePlatform(subscription, platform.id).allowed;
          const isConnected = connectedPlatforms.includes(platform.id);
          const isSelected = selectedPlatforms.includes(platform.id);
          const isLocked = !hasAccess;

          // Determine if this platform can be toggled
          const canToggle = hasAccess && isConnected;

          // For multi-select: check if selecting this would exceed allowed
          const wouldExceedMultiPublish =
            !isSelected &&
            selectedPlatforms.length >= 1 &&
            !canMultiPublish.allowed;

          return (
            <button
              key={platform.id}
              onClick={() => {
                // Plan-locked → never offer connect, just hint about upgrade.
                if (isLocked) {
                  triggerHaptic("error");
                  toast.info(`${platform.name} nécessite un plan supérieur`);
                  return;
                }

                // Connected → toggle selection (or warn about multi-publish gate).
                if (isConnected) {
                  if (wouldExceedMultiPublish) {
                    triggerHaptic("error");
                    toast.warning("Publication multi-plateformes réservée au plan Max");
                    return;
                  }
                  triggerHaptic("selection");
                  onToggle(platform.id);
                  return;
                }

                // Not connected but accessible → ask the parent to open the
                // connect popup. Fall back to the legacy hint if no handler.
                triggerHaptic("light");
                if (onConnectRequest) {
                  onConnectRequest(platform.id);
                } else {
                  toast.info(`Connecte d'abord ${platform.name} dans Paramètres`);
                }
              }}
              disabled={false}
              className={`
                min-h-[72px] p-3 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center justify-center gap-1 relative
                ${
                  isLocked
                    ? "bg-dark-bg/30 border-dark-border/30 cursor-not-allowed"
                    : !isConnected
                    ? "bg-dark-bg/40 border-dark-border/60 border-dashed text-text-secondary hover:border-dark-hover hover:bg-dark-bg/60 cursor-pointer"
                    : wouldExceedMultiPublish && !isSelected
                    ? "bg-dark-bg/50 border-dark-border/50 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? `${platform.bgColor} ${platform.borderColor} ${platform.color}`
                    : "bg-dark-bg border-dark-border text-text-secondary hover:border-dark-hover hover:text-white"
                }
              `}
            >
              {/* Locked overlay — icon stays visible underneath */}
              {isLocked && (
                <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-dark-bg/60 backdrop-blur-[1px] z-10">
                  <svg className="w-3.5 h-3.5 text-text-muted mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <PlanBadge plan={platform.minPlan} />
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && isConnected && !isLocked && (
                <div className="absolute top-1.5 right-1.5">
                  <svg
                    className={`w-4 h-4 ${platform.color}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Icon — always colored so it's visible behind locked overlay */}
              <div className={isSelected && !isLocked ? platform.color : isLocked ? `${platform.color} opacity-40` : "text-text-muted"}>
                {platform.icon}
              </div>

              {/* Name */}
              <span className="text-xs font-medium">{platform.name}</span>

              {/* Status */}
              {!isLocked && (
                <span
                  className={`text-[10px] ${
                    isConnected ? "text-accent/80" : "text-text-muted"
                  }`}
                >
                  {isConnected ? t.publish.connected : t.publish.notConnected}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upgrade hint */}
      {visiblePlatforms.some((p) => !canUsePlatform(subscription, p.id).allowed) && (
        <Link
          href="/subscription"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:text-accent transition-colors bg-primary/5 border border-primary/10 rounded-lg py-2 px-3"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="truncate">{t.publish.upgradeToUnlock}</span>
        </Link>
      )}
    </div>
  );
}

