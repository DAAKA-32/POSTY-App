"use client";

import { Platform } from "@/types";

interface PlatformLimit {
  platform: Platform;
  name: string;
  limit: number;
  color: string;
}

const PLATFORM_LIMITS: PlatformLimit[] = [
  { platform: "linkedin", name: "LinkedIn", limit: 3000, color: "#0A66C2" },
];

interface CharacterCounterProps {
  content: string;
  selectedPlatforms: Platform[];
}

export default function CharacterCounter({
  content,
  selectedPlatforms,
}: CharacterCounterProps) {
  const characterCount = content.length;

  // Only show limits for selected platforms
  const relevantLimits = PLATFORM_LIMITS.filter((p) =>
    selectedPlatforms.includes(p.platform)
  );

  if (relevantLimits.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {relevantLimits.map((limit) => {
        const isOverLimit = limit.limit > 0 && characterCount > limit.limit;
        const percentage =
          limit.limit > 0
            ? Math.min((characterCount / limit.limit) * 100, 100)
            : 0;

        return (
          <div key={limit.platform} className="flex items-center gap-2">
            <span className="text-text-muted">{limit.name}:</span>
            <div className="flex items-center gap-1.5">
              {/* Mini progress bar for limited platforms */}
              {limit.limit > 0 && (
                <div className="w-12 h-1 bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOverLimit ? "#ef4444" : limit.color,
                    }}
                  />
                </div>
              )}
              <span
                className={`font-medium ${
                  isOverLimit ? "text-error" : "text-text-secondary"
                }`}
              >
                {characterCount}
                {limit.limit > 0 ? `/${limit.limit}` : ""}
              </span>
              {isOverLimit && (
                <svg
                  className="w-3.5 h-3.5 text-error"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
