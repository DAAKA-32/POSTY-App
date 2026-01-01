"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface ProfileLinkedInCardProps {
  isConnected: boolean;
  isTokenValid?: boolean;
  profileName?: string | null;
  profilePicture?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

export default function ProfileLinkedInCard({
  isConnected,
  isTokenValid = false,
  profileName,
  profilePicture,
  onConnect,
  onDisconnect,
  isLoading = false,
}: ProfileLinkedInCardProps) {
  // LinkedIn brand color
  const linkedInBlue = "#0A66C2";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="bg-dark-card border border-dark-border rounded-2xl p-5 lg:p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${linkedInBlue}20` }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={linkedInBlue}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">LinkedIn</h3>
          <p className="text-sm text-text-muted">
            {isConnected ? "Compte connecte" : "Connectez votre compte"}
          </p>
        </div>
      </div>

      {/* Connected state */}
      {isConnected ? (
        <div className="space-y-4">
          {/* Profile info */}
          <div className="flex items-center gap-3 p-3 bg-dark-hover rounded-xl">
            {profilePicture ? (
              <Image
                src={profilePicture}
                alt={profileName || "LinkedIn"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-border flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {profileName || "Profil LinkedIn"}
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isTokenValid ? "bg-success" : "bg-warning"}`} />
                <span className="text-xs text-text-muted">
                  {isTokenValid ? "Session active" : "Session expiree"}
                </span>
              </div>
            </div>
          </div>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            disabled={isLoading}
            className="
              w-full flex items-center justify-center gap-2
              py-2.5 bg-dark-hover hover:bg-dark-active
              border border-dark-border hover:border-error/30
              rounded-xl text-sm font-medium text-text-secondary hover:text-error
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            Deconnecter LinkedIn
          </button>
        </div>
      ) : (
        /* Disconnected state */
        <div className="space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Connectez votre compte LinkedIn pour publier directement vos posts depuis POSTY.
          </p>

          <button
            onClick={onConnect}
            disabled={isLoading}
            className="
              w-full flex items-center justify-center gap-2
              py-3 rounded-xl text-sm font-semibold text-white
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{ backgroundColor: linkedInBlue }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            )}
            Connecter LinkedIn
          </button>
        </div>
      )}
    </motion.div>
  );
}
