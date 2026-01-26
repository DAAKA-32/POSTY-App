"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanBadge } from "@/components/subscription/PlanInfoCard";
import Image from "next/image";

interface ProfileMenuProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    color: "emerald",
    iconColor: "text-emerald-500",
    glowColor: "rgba(16, 185, 129, 0.3)", // emerald glow
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    name: "Profil",
    href: "/profile",
    color: "cyan",
    iconColor: "text-cyan-500",
    glowColor: "rgba(6, 182, 212, 0.3)", // cyan glow
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    name: "Abonnement",
    href: "/subscription",
    color: "orange",
    iconColor: "text-orange-500",
    glowColor: "rgba(249, 115, 22, 0.3)", // orange glow
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    name: "Paramètres",
    href: "/settings",
    color: "violet",
    iconColor: "text-violet-500",
    glowColor: "rgba(139, 92, 246, 0.3)", // violet glow
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export default function ProfileMenu({ isCollapsed = false, onNavigate }: ProfileMenuProps) {
  const { user, userProfile } = useAuth();
  const { profilePicture: linkedInPhoto } = useLinkedIn();
  const { planConfig, isTestMode } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Priority: LinkedIn photo > Firestore photo > fallback
  const photoURL = !imageError
    ? linkedInPhoto || userProfile?.photoURL || null
    : null;

  // Reset image error when photo URL changes
  useEffect(() => {
    setImageError(false);
  }, [linkedInPhoto, userProfile?.photoURL]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className={`
          flex items-center justify-center gap-2 px-4 py-3
          bg-gradient-to-r from-primary to-primary-hover
          hover:from-primary-hover hover:to-primary
          text-white font-medium rounded-lg
          transition-all duration-200 shadow-glow hover:shadow-lg
          ${isCollapsed ? "w-full" : ""}
        `}
      >
        {isCollapsed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        ) : (
          "Se connecter"
        )}
      </Link>
    );
  }

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-3 p-2 rounded-lg w-full
          hover:bg-dark-hover transition-all duration-200 group
          ${isCollapsed ? "justify-center" : ""}
          ${isOpen ? "bg-dark-hover" : ""}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={`
          relative w-10 h-10 rounded-lg overflow-hidden
          flex items-center justify-center shrink-0 border border-dark-border
          group-hover:border-primary/30 group-hover:scale-105 transition-all duration-200
          ${isOpen ? "border-primary/30 scale-105" : ""}
          ${!photoURL ? "bg-gradient-to-br from-primary/20 to-accent/20" : ""}
        `}>
          {photoURL ? (
            <Image
              src={photoURL}
              alt={userProfile?.displayName || "Avatar"}
              fill
              sizes="40px"
              className="object-cover object-center"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-primary font-semibold text-lg">
              {userProfile?.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {userProfile?.displayName || "Utilisateur"}
                </p>
                {/* Plan badge */}
                <PlanBadge />
              </div>
              {userProfile?.profile?.role ? (
                <p className="text-xs text-accent truncate">{userProfile.profile.role}</p>
              ) : (
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              )}
            </div>
            {/* Chevron indicator */}
            <div className="shrink-0 w-6 h-6 flex items-center justify-center">
              <svg
                className={`w-5 h-5 text-text-muted group-hover:text-text-primary transition-all duration-200 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className={`
          absolute z-50 w-56
          ${isCollapsed ? "left-full ml-2 bottom-0" : "bottom-full left-0 mb-2"}
          bg-dark-card border border-dark-border rounded-xl
          shadow-xl shadow-black/20
          transform transition-all duration-200 origin-bottom
          ${isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          }
        `}
        role="menu"
        aria-orientation="vertical"
      >
        {/* User info header */}
        <div className="px-4 py-3 border-b border-dark-border">
          <p className="text-sm font-semibold text-text-primary truncate">
            {userProfile?.displayName || "Utilisateur"}
          </p>
          <p className="text-xs text-text-muted truncate">{user.email}</p>
        </div>

        {/* Menu items - Enhanced with vivid colors and glow effects */}
        <div className="p-1.5">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleItemClick}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-text-secondary text-sm
                transition-all duration-200 group/item
                hover:translate-x-0.5 active:scale-[0.98]
                ${
                  item.color === "emerald"
                    ? "hover:bg-emerald-500/10"
                    : item.color === "cyan"
                    ? "hover:bg-cyan-500/10"
                    : item.color === "orange"
                    ? "hover:bg-orange-500/10"
                    : item.color === "violet"
                    ? "hover:bg-violet-500/10"
                    : "hover:bg-dark-hover"
                }
              `}
              role="menuitem"
            >
              {/* Vivid colored icon with glow effect */}
              <span
                className={`
                  transition-all duration-200
                  ${item.iconColor}
                  group-hover/item:scale-110
                `}
                style={{
                  filter: `drop-shadow(0 0 4px ${item.glowColor})`,
                }}
              >
                {item.icon}
              </span>
              <span className="font-medium group-hover/item:text-text-primary transition-colors duration-200">{item.name}</span>
            </Link>
          ))}
        </div>

        {/* Arrow indicator for collapsed mode */}
        {isCollapsed && (
          <div className="absolute -left-1.5 bottom-4 w-3 h-3 bg-dark-card border-l border-b border-dark-border rotate-45" />
        )}
      </div>

      {/* Tooltip for collapsed mode (only when menu is closed) */}
      {isCollapsed && !isOpen && (
        <div className="
          absolute left-full ml-2 bottom-0
          px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg
          text-sm whitespace-nowrap
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200 z-40
          shadow-lg
          pointer-events-none
        ">
          <p className="font-semibold text-text-primary">{userProfile?.displayName || "Utilisateur"}</p>
          <p className="text-xs text-text-muted">{user.email}</p>
          <div className="absolute -left-1 bottom-3 w-2 h-2 bg-dark-elevated border-l border-b border-dark-border rotate-45" />
        </div>
      )}
    </div>
  );
}
