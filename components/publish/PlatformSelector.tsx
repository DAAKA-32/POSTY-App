"use client";

import { Platform } from "@/types";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLATFORM_INFO, PlanType } from "@/lib/plans";
import { canUsePlatform, canPublishSimultaneously } from "@/lib/permissions";
import Link from "next/link";
import { triggerHaptic } from "@/hooks/useHapticFeedback";

// Platform icons
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface PlatformOption {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  minPlan: PlanType;
}

const PLATFORMS: PlatformOption[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <LinkedInIcon className="w-5 h-5" />,
    color: "text-[#0A66C2]",
    bgColor: "bg-[#0A66C2]/20",
    borderColor: "border-[#0A66C2]",
    minPlan: "free",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: <RedditIcon className="w-5 h-5" />,
    color: "text-[#FF4500]",
    bgColor: "bg-[#FF4500]/20",
    borderColor: "border-[#FF4500]",
    minPlan: "pro",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <InstagramIcon className="w-5 h-5" />,
    color: "text-[#E4405F]",
    bgColor: "bg-[#E4405F]/20",
    borderColor: "border-[#E4405F]",
    minPlan: "max",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FacebookIcon className="w-5 h-5" />,
    color: "text-[#1877F2]",
    bgColor: "bg-[#1877F2]/20",
    borderColor: "border-[#1877F2]",
    minPlan: "max",
  },
];

// Plan badge component
function PlanBadge({ plan }: { plan: PlanType }) {
  const colors = {
    free: "bg-text-muted/20 text-text-muted",
    pro: "bg-primary/20 text-primary",
    max: "bg-accent/20 text-accent",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${colors[plan]}`}>
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
}

export default function PlatformSelector({
  selectedPlatforms,
  connectedPlatforms,
  onToggle,
  showAllPlatforms = true,
}: PlatformSelectorProps) {
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
          Publier sur
        </p>
        {selectedPlatforms.length > 1 && !canMultiPublish.allowed && (
          <span className="text-[10px] text-warning">
            Publication simultanée: <PlanBadge plan="max" />
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
                if (canToggle && !wouldExceedMultiPublish) {
                  // Haptic feedback for successful selection
                  triggerHaptic("selection");
                  onToggle(platform.id);
                } else if (isLocked || !isConnected || wouldExceedMultiPublish) {
                  // Haptic feedback for blocked action
                  triggerHaptic("error");
                }
              }}
              disabled={!canToggle || (wouldExceedMultiPublish && !isSelected)}
              className={`
                min-h-[72px] p-3 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center justify-center gap-1 relative
                ${
                  isLocked
                    ? "bg-dark-bg/30 border-dark-border/30 opacity-60 cursor-not-allowed"
                    : !isConnected
                    ? "bg-dark-bg/50 border-dark-border/50 opacity-50 cursor-not-allowed"
                    : wouldExceedMultiPublish && !isSelected
                    ? "bg-dark-bg/50 border-dark-border/50 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? `${platform.bgColor} ${platform.borderColor} ${platform.color}`
                    : "bg-dark-bg border-dark-border text-text-secondary hover:border-dark-hover hover:text-white"
                }
              `}
            >
              {/* Locked overlay */}
              {isLocked && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-dark-bg/40 z-10">
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <PlanBadge plan={platform.minPlan} />
                  </div>
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

              {/* "Coming soon" badge for non-LinkedIn platforms that are accessible but not yet implemented */}
              {hasAccess && !isLocked && platform.id !== "linkedin" && (
                <div className="absolute top-1 right-1">
                  <span className={`text-[8px] bg-dark-hover px-1 py-0.5 rounded ${
                    platform.id === "instagram" || platform.id === "facebook"
                      ? "text-primary"
                      : "text-text-muted"
                  }`}>
                    {platform.id === "instagram" || platform.id === "facebook"
                      ? "Très bientôt"
                      : "Bientôt"}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={isSelected && !isLocked ? platform.color : "text-text-muted"}>
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
                  {platform.id === "linkedin"
                    ? isConnected
                      ? "Connecté"
                      : "Non connecté"
                    : platform.id === "instagram" || platform.id === "facebook"
                    ? "Très prochainement"
                    : "Bientôt disponible"}
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
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:text-accent transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Débloquer plus de plateformes
        </Link>
      )}
    </div>
  );
}

export { PLATFORMS };
