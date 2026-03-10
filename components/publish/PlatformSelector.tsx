"use client";

import { Platform } from "@/types";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLATFORM_INFO, PlanType } from "@/lib/plans";
import { canUsePlatform, canPublishSimultaneously } from "@/lib/permissions";
import Link from "next/link";
import { triggerHaptic } from "@/hooks/useHapticFeedback";
import { useLanguage } from "@/contexts/LanguageContext";

// Platform icons
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.107-1.138 3.552-1.199 1.07-.044 2.064.068 2.967.315-.024-1.058-.175-1.878-.453-2.45-.354-.73-.942-1.1-1.746-1.1h-.075c-.596.02-1.09.218-1.468.591-.33.326-.53.77-.59 1.318l-2.07-.248c.101-.886.476-1.653 1.084-2.22.71-.662 1.652-1.013 2.723-1.054h.11c1.387 0 2.467.522 3.213 1.552.637.88.975 2.106 1.005 3.648v.156c1.145.504 2.06 1.265 2.652 2.226.756 1.227.911 2.759.436 4.313-.59 1.93-1.776 3.404-3.438 4.267-1.457.756-3.24 1.156-5.3 1.19zm-1.042-6.594c-.036 0-.072 0-.108.002-.982.053-1.74.358-2.19.882-.403.47-.583 1.04-.549 1.686.044.822.457 1.397 1.127 1.83.618.4 1.42.583 2.198.543 1.122-.06 1.98-.46 2.546-1.166.49-.61.82-1.49.954-2.553-.946-.326-2.024-.485-3.123-.485-.288 0-.576.013-.855.038v.223z" />
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
    minPlan: "pro",
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
    id: "threads",
    name: "Threads",
    icon: <ThreadsIcon className="w-5 h-5" />,
    color: "text-[#000000] dark:text-white",
    bgColor: "bg-black/10 dark:bg-white/20",
    borderColor: "border-black dark:border-white",
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
}

export default function PlatformSelector({
  selectedPlatforms,
  connectedPlatforms,
  onToggle,
  showAllPlatforms = true,
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

              {/* "Coming soon" badge for platforms that are accessible but not yet implemented */}
              {hasAccess && !isLocked && platform.id === "reddit" && !isSelected && (
                <div className="absolute top-1 right-1">
                  <span className="text-[8px] bg-dark-hover px-1 py-0.5 rounded text-text-muted">
                    {t.publish.comingSoon}
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
                  {platform.id === "reddit"
                    ? t.publish.comingSoonFull
                    : isConnected
                    ? t.publish.connected
                    : t.publish.notConnected}
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
          {t.publish.unlockMorePlatforms}
        </Link>
      )}
    </div>
  );
}

export { PLATFORMS, RedditIcon, ThreadsIcon, FacebookIcon };
