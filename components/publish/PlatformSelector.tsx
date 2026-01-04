"use client";

import { Platform } from "@/types";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";

interface PlatformOption {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const PLATFORMS: PlatformOption[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <LinkedInIcon className="w-5 h-5" />,
    color: "text-[#0A66C2]",
    bgColor: "bg-[#0A66C2]/20",
    borderColor: "border-[#0A66C2]",
  },
];

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  connectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
}

export default function PlatformSelector({
  selectedPlatforms,
  connectedPlatforms,
  onToggle,
}: PlatformSelectorProps) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wide">
        Publier sur
      </p>
      <div className="grid grid-cols-1 gap-2">
        {PLATFORMS.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          const isSelected = selectedPlatforms.includes(platform.id);

          return (
            <button
              key={platform.id}
              onClick={() => isConnected && onToggle(platform.id)}
              disabled={!isConnected}
              className={`
                min-h-[64px] p-3 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center justify-center gap-1.5 relative
                ${
                  !isConnected
                    ? "bg-dark-bg/50 border-dark-border/50 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? `${platform.bgColor} ${platform.borderColor} ${platform.color}`
                    : "bg-dark-bg border-dark-border text-text-secondary hover:border-dark-hover hover:text-white"
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && isConnected && (
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

              {/* Icon */}
              <div className={isSelected ? platform.color : ""}>{platform.icon}</div>

              {/* Name */}
              <span className="text-xs font-medium">{platform.name}</span>

              {/* Status */}
              <span
                className={`text-[10px] ${
                  isConnected ? "text-accent/80" : "text-text-muted"
                }`}
              >
                {isConnected ? "Connecte" : "Non connecte"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PLATFORMS };
