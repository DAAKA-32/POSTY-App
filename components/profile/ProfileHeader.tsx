"use client";

import { motion } from "framer-motion";
import ProfileAvatar from "@/components/ui/ProfileAvatar";

interface ProfileHeaderProps {
  displayName: string;
  role?: string;
  sector?: string;
  bio?: string;
  linkedInConnected?: boolean;
  onEdit?: () => void;
  isEditing?: boolean;
}

export default function ProfileHeader({
  displayName,
  role,
  sector,
  bio,
  linkedInConnected = false,
  onEdit,
  isEditing = false,
}: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Premium gradient background - theme aware */}
      <div className="absolute inset-x-0 -top-4 h-32 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent dark:from-primary/8 dark:via-accent/5 rounded-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 dark:bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left gap-5 lg:gap-6">
        {/* Avatar with premium glow - Clean display without badge */}
        <div className="relative group shrink-0">
          {/* Glow effect */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
          <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-2xl bg-gradient-to-r from-primary to-accent p-[3px] shadow-md group-hover:shadow-glow transition-shadow duration-300">
            <div className="w-full h-full rounded-[13px] overflow-hidden">
              <ProfileAvatar
                size="xl"
                showLinkedInBadge={false}
                priority
                className="w-full h-full !rounded-none"
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Name - theme aware */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-text-primary tracking-tight">
            {displayName || "Utilisateur"}
          </h1>

          {/* Role - theme aware with better contrast */}
          {role && (
            <p className="mt-1 text-base lg:text-lg text-gray-600 dark:text-text-secondary font-medium">
              {role}
            </p>
          )}

          {/* Sector badge - Always gradient style like edit button */}
          {sector && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5
                bg-gradient-to-r from-primary to-accent
                text-white
                text-sm font-medium rounded-lg
                border border-transparent
                shadow-sm
                transition-colors duration-200"
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
          {bio && !isEditing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-sm text-gray-500 dark:text-text-muted max-w-md leading-relaxed"
            >
              {bio}
            </motion.p>
          )}
        </div>

        {/* Edit button - Always gradient style */}
        {onEdit && !isEditing && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onEdit}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="
              absolute top-0 right-0 lg:relative lg:top-auto lg:right-auto
              flex items-center gap-2 px-4 py-2.5
              bg-gradient-to-r from-primary to-accent
              border border-transparent
              rounded-xl text-sm font-medium
              text-white
              shadow-sm hover:shadow-glow
              transition-all duration-300
            "
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
