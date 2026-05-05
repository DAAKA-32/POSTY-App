"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useAuth } from "@/contexts/AuthContext";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ProfileAvatarProps {
  size?: AvatarSize;
  className?: string;
  showLinkedInBadge?: boolean;
  onClick?: () => void;
  priority?: boolean;
  /**
   * When set, takes precedence over the auto-resolved LinkedIn / Firebase
   * photo URL. Use it for branding overrides (e.g. a user-uploaded custom
   * avatar) — pass `null` or omit to keep auto-resolution.
   */
  photoURLOverride?: string | null;
  /**
   * What to show when no photo is available or every load attempt fails.
   * - "icon"     → neutral gray user silhouette (default, matches spec)
   * - "initials" → primary-tinted initials inside a soft gradient
   */
  fallbackKind?: "icon" | "initials";
}

const sizeConfig: Record<
  AvatarSize,
  { container: string; text: string; badge: string; icon: string; px: number }
> = {
  xs: { container: "w-8 h-8",  text: "text-sm",  badge: "w-3 h-3 -bottom-0.5 -right-0.5",  icon: "w-4 h-4",  px: 32 },
  sm: { container: "w-10 h-10", text: "text-base", badge: "w-3.5 h-3.5 -bottom-0.5 -right-0.5", icon: "w-5 h-5", px: 40 },
  md: { container: "w-12 h-12", text: "text-lg",  badge: "w-4 h-4 -bottom-1 -right-1",     icon: "w-6 h-6",  px: 48 },
  lg: { container: "w-16 h-16", text: "text-2xl", badge: "w-5 h-5 -bottom-1 -right-1",     icon: "w-8 h-8",  px: 64 },
  xl: { container: "w-24 h-24", text: "text-3xl", badge: "w-6 h-6 -bottom-1 -right-1",     icon: "w-12 h-12", px: 96 },
};

/**
 * ProfileAvatar — single source of truth for the user avatar across the app.
 *
 * Resolution order (unless `photoURLOverride` is provided):
 *   1. LinkedIn photo (if connected)
 *   2. Firestore `userProfile.photoURL` (typically Google sign-in)
 *   3. Firebase Auth `user.photoURL`
 *   4. Fallback (gray icon by default, or initials if `fallbackKind="initials"`)
 *
 * Robustness:
 *   - On image error: tries to refresh the LinkedIn URL once (the underlying
 *     CDN URL expires periodically), then a cache-buster retry. After two
 *     failed attempts it gives up and shows the fallback — never a broken icon.
 */
export default function ProfileAvatar({
  size = "md",
  className = "",
  showLinkedInBadge = false,
  onClick,
  priority = false,
  photoURLOverride,
  fallbackKind = "icon",
}: ProfileAvatarProps) {
  const { user, userProfile } = useAuth();
  const { profilePicture: linkedInPhoto, isConnected: linkedInConnected, refreshProfilePhoto } = useLinkedIn();

  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cacheBuster, setCacheBuster] = useState("");
  const refreshAttemptedRef = useRef(false);

  const config = sizeConfig[size];

  // Source resolution. `photoURLOverride === null` means "explicitly no photo
  // even if one would be auto-resolved" — useful for previews. `undefined`
  // means "use auto-resolution".
  const autoResolved = linkedInPhoto || userProfile?.photoURL || user?.photoURL || null;
  const baseURL =
    photoURLOverride === undefined ? autoResolved : photoURLOverride;
  const photoURL =
    !imageError && baseURL && cacheBuster
      ? `${baseURL}${baseURL.includes("?") ? "&" : "?"}v=${cacheBuster}`
      : !imageError
        ? baseURL
        : null;

  const displayName = userProfile?.displayName || user?.displayName || user?.email || "U";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Reset error state whenever any source URL changes.
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
    setCacheBuster("");
    refreshAttemptedRef.current = false;
  }, [linkedInPhoto, userProfile?.photoURL, user?.photoURL, photoURLOverride]);

  /**
   * Image load error handling:
   *  - 1st try: ask LinkedInContext to refresh the URL (CDN URL likely expired)
   *  - 2nd try: append a cache-buster to bypass any stale browser cache
   *  - 3rd try: give up → fall through to the gray-icon / initials fallback
   */
  const handleImageError = useCallback(async () => {
    if (retryCount >= 2) {
      setImageError(true);
      return;
    }

    if (linkedInPhoto && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true;
      const newUrl = await refreshProfilePhoto();
      if (newUrl) {
        setRetryCount((c) => c + 1);
        return;
      }
    }

    setCacheBuster(Date.now().toString());
    setRetryCount((c) => c + 1);
  }, [retryCount, linkedInPhoto, refreshProfilePhoto]);

  const isClickable = !!onClick;
  // Allow callers to override the rounding via `!rounded-*` modifiers.
  const hasRoundedOverride = className.includes("!rounded");

  return (
    <div
      className={`
        relative ${config.container}
        ${hasRoundedOverride ? "" : "rounded-xl"}
        ${isClickable ? "cursor-pointer group" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {photoURL ? (
        <div className={`relative w-full h-full overflow-hidden ${hasRoundedOverride ? "" : "rounded-xl"}`}>
          <Image
            src={photoURL}
            alt={displayName}
            fill
            sizes={`${config.px}px`}
            className={`
              object-cover object-center
              transition-transform duration-300
              ${isClickable ? "group-hover:scale-105" : ""}
            `}
            onError={handleImageError}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            unoptimized
          />
          {isClickable && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          )}
        </div>
      ) : fallbackKind === "initials" ? (
        <div
          className={`
            w-full h-full
            ${hasRoundedOverride ? "" : "rounded-xl"}
            flex items-center justify-center
            bg-gradient-to-br from-primary/20 to-accent/20
            border border-gray-200 dark:border-dark-border
            ${isClickable ? "group-hover:border-primary/30 transition-colors" : ""}
          `}
        >
          <span className={`text-primary font-semibold ${config.text}`}>{initials}</span>
        </div>
      ) : (
        // Gray neutral fallback — default. Matches the spec ("avatar gris").
        <div
          className={`
            w-full h-full
            ${hasRoundedOverride ? "" : "rounded-xl"}
            flex items-center justify-center
            bg-gray-200 dark:bg-dark-elevated
            border border-gray-200 dark:border-dark-border
            ${isClickable ? "group-hover:border-primary/30 transition-colors" : ""}
          `}
          aria-label={displayName}
        >
          <svg
            className={`${config.icon} text-gray-400 dark:text-text-muted`}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
          </svg>
        </div>
      )}

      {showLinkedInBadge && linkedInConnected && (
        <div
          className={`
            absolute ${config.badge}
            bg-[#0A66C2] rounded-full
            flex items-center justify-center
            border-2 border-white dark:border-dark-card
            shadow-sm
          `}
          title="LinkedIn"
          aria-label="LinkedIn connected"
        >
          <svg className="w-2/3 h-2/3 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Compact variant for small spaces (e.g. comments, lists). Takes an explicit
// photoURL — no auto-resolution.
export function CompactAvatar({
  photoURL,
  name,
  size = "sm",
  className = "",
}: {
  photoURL?: string | null;
  name?: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];

  return (
    <div className={`relative ${config.container} rounded-full shrink-0 ${className}`}>
      {photoURL && !imageError ? (
        <Image
          src={photoURL}
          alt={name || "Avatar"}
          fill
          sizes={`${config.px}px`}
          className="object-cover object-center rounded-full"
          onError={() => setImageError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
          unoptimized
        />
      ) : (
        <div
          className={`
            ${config.container} rounded-full
            flex items-center justify-center
            bg-gray-200 dark:bg-dark-elevated
            border border-gray-200 dark:border-dark-border
          `}
          aria-label={name || "Avatar"}
        >
          <svg
            className={`${config.icon} text-gray-400 dark:text-text-muted`}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
          </svg>
        </div>
      )}
    </div>
  );
}
