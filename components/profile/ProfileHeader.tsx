"use client";

import { motion } from "framer-motion";
import { PersonalBranding, GRADIENT_PRESETS } from "@/types";
import { Globe, Linkedin, Twitter, Github, Instagram, Youtube } from "lucide-react";

interface ProfileHeaderProps {
  displayName: string;
  role?: string;
  sector?: string;
  bio?: string;
  linkedInConnected?: boolean;
  onEdit?: () => void;
  isEditing?: boolean;
  // Personal branding props
  branding?: PersonalBranding;
  photoURL?: string | null;
}

// Social link icons mapping
const socialIcons = {
  website: Globe,
  linkedin: Linkedin,
  twitter: Twitter,
  github: Github,
  instagram: Instagram,
  youtube: Youtube,
};

export default function ProfileHeader({
  displayName,
  role,
  sector,
  bio,
  linkedInConnected = false,
  onEdit,
  isEditing = false,
  branding,
  photoURL,
}: ProfileHeaderProps) {
  // Get gradient colors from branding or defaults
  const getGradientColors = () => {
    if (branding?.gradientPreset && GRADIENT_PRESETS[branding.gradientPreset as keyof typeof GRADIENT_PRESETS]) {
      const preset = GRADIENT_PRESETS[branding.gradientPreset as keyof typeof GRADIENT_PRESETS];
      return { start: preset.start, end: preset.end };
    }
    if (branding?.customGradientStart && branding?.customGradientEnd) {
      return { start: branding.customGradientStart, end: branding.customGradientEnd };
    }
    return { start: "#F8935D", end: "#F76B54" }; // Default brand gradient
  };

  const gradientColors = getGradientColors();
  const accentColor = branding?.accentColor || "#F8935D";
  const avatarURL = branding?.customAvatarURL || photoURL;
  const hasCover = !!branding?.coverImageURL;
  const hasTagline = !!branding?.tagline;
  const hasSocialLinks = branding?.socialLinks && Object.values(branding.socialLinks).some(Boolean);

  // Check visibility settings
  const showBio = branding?.visibility?.showBio !== false;
  const showSector = branding?.visibility?.showSector !== false;
  const showSocialLinks = branding?.visibility?.showSocialLinks !== false;

  // Get user initials for fallback
  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Cover image or gradient background */}
      {hasCover ? (
        <div
          className="absolute inset-x-0 -top-6 h-40 rounded-3xl overflow-hidden pointer-events-none"
          style={{
            backgroundImage: `url(${branding?.coverImageURL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-dark-bg" />
        </div>
      ) : (
        <>
          {/* Premium gradient background - theme aware */}
          <div
            className="absolute inset-x-0 -top-4 h-32 rounded-3xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${gradientColors.start}15, ${gradientColors.end}08, transparent)`,
            }}
          />
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${gradientColors.end}08` }}
          />
        </>
      )}

      <div className={`relative flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left gap-5 lg:gap-6 ${hasCover ? "pt-20" : ""}`}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl p-[3px] shadow-md"
            style={{
              background: `linear-gradient(135deg, ${gradientColors.start}, ${gradientColors.end})`,
            }}
          >
            <div className="w-full h-full rounded-[13px] overflow-hidden bg-white dark:bg-dark-card flex items-center justify-center">
              {avatarURL ? (
                <img
                  src={avatarURL}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-3xl font-bold"
                  style={{ color: accentColor }}
                >
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Name - theme aware */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-text-primary tracking-tight">
            {displayName || "Utilisateur"}
          </h1>

          {/* Tagline (if set) */}
          {hasTagline && (
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: accentColor }}
            >
              {branding?.tagline}
            </p>
          )}

          {/* Role - theme aware with better contrast */}
          {role && (
            <p className="mt-1 text-base lg:text-lg text-gray-600 dark:text-text-secondary font-medium">
              {role}
            </p>
          )}

          {/* Sector badge */}
          {sector && showSector && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-primary bg-primary/10 text-sm font-medium rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {sector}
            </motion.span>
          )}

          {/* Bio - theme aware */}
          {bio && !isEditing && showBio && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-sm text-gray-500 dark:text-text-muted max-w-md leading-relaxed"
            >
              {bio}
            </motion.p>
          )}

          {/* Social Links */}
          {hasSocialLinks && showSocialLinks && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-4 flex-wrap"
            >
              {Object.entries(branding?.socialLinks || {}).map(([key, url]) => {
                if (!url) return null;
                const Icon = socialIcons[key as keyof typeof socialIcons];
                if (!Icon) return null;

                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-primary hover:text-white transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Edit button */}
        {onEdit && !isEditing && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onEdit}
            className="absolute top-0 right-0 lg:relative lg:top-auto lg:right-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <span className="hidden lg:inline">Modifier</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
