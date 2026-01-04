"use client";

import { useState, useEffect } from "react";
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
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; badge: string; px: number }> = {
  xs: { container: "w-8 h-8", text: "text-sm", badge: "w-3 h-3 -bottom-0.5 -right-0.5", px: 32 },
  sm: { container: "w-10 h-10", text: "text-base", badge: "w-3.5 h-3.5 -bottom-0.5 -right-0.5", px: 40 },
  md: { container: "w-12 h-12", text: "text-lg", badge: "w-4 h-4 -bottom-1 -right-1", px: 48 },
  lg: { container: "w-16 h-16", text: "text-2xl", badge: "w-5 h-5 -bottom-1 -right-1", px: 64 },
  xl: { container: "w-24 h-24", text: "text-3xl", badge: "w-6 h-6 -bottom-1 -right-1", px: 96 },
};

export default function ProfileAvatar({
  size = "md",
  className = "",
  showLinkedInBadge = false,
  onClick,
  priority = false,
}: ProfileAvatarProps) {
  const { user, userProfile } = useAuth();
  const { profilePicture: linkedInPhoto, isConnected: linkedInConnected } = useLinkedIn();
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const config = sizeConfig[size];

  // Priority: LinkedIn photo > Google photo > Firestore photo > fallback
  const photoURL = !imageError
    ? linkedInPhoto || userProfile?.photoURL || user?.photoURL || null
    : null;

  // Get initials for fallback
  const displayName = userProfile?.displayName || user?.displayName || user?.email || "U";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Reset image error when photo URL changes
  useEffect(() => {
    setImageError(false);
    setIsLoaded(false);
  }, [linkedInPhoto, userProfile?.photoURL]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const isClickable = !!onClick;

  return (
    <div
      className={`
        relative ${config.container} rounded-xl
        ${isClickable ? "cursor-pointer group" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Background gradient (always visible for loading state) */}
      <div
        className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-br from-primary/20 to-accent/20
          border border-dark-border
          ${isClickable ? "group-hover:border-primary/30 transition-colors" : ""}
        `}
      />

      {/* Photo */}
      {photoURL && !imageError ? (
        <div className={`relative ${config.container} rounded-xl overflow-hidden`}>
          <Image
            src={photoURL}
            alt={displayName}
            fill
            sizes={`${config.px}px`}
            className={`
              object-cover
              transition-all duration-300
              ${isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}
              ${isClickable ? "group-hover:scale-105" : ""}
            `}
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
          {/* Hover overlay for clickable */}
          {isClickable && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
          )}
        </div>
      ) : (
        /* Fallback initials */
        <div
          className={`
            ${config.container} rounded-xl
            flex items-center justify-center
            bg-gradient-to-br from-primary/20 to-accent/20
            border border-dark-border
            ${isClickable ? "group-hover:border-primary/30 transition-colors" : ""}
          `}
        >
          <span className={`text-primary font-semibold ${config.text}`}>
            {initials}
          </span>
        </div>
      )}

      {/* LinkedIn badge */}
      {showLinkedInBadge && linkedInConnected && (
        <div
          className={`
            absolute ${config.badge}
            bg-[#0A66C2] rounded-full
            flex items-center justify-center
            border-2 border-dark-card
            shadow-sm
          `}
          title="Compte LinkedIn connecte"
        >
          <svg
            className="w-2/3 h-2/3 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Compact version for small spaces (e.g., comments, lists)
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
  const initials = (name || "U").charAt(0).toUpperCase();

  return (
    <div className={`relative ${config.container} rounded-full shrink-0 ${className}`}>
      {photoURL && !imageError ? (
        <Image
          src={photoURL}
          alt={name || "Avatar"}
          fill
          sizes={`${config.px}px`}
          className="object-cover rounded-full"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div
          className={`
            ${config.container} rounded-full
            flex items-center justify-center
            bg-gradient-to-br from-primary/20 to-accent/20
            border border-dark-border
          `}
        >
          <span className={`text-primary font-medium ${config.text}`}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
