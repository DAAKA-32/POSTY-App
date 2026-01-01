"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileSectionProps {
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  action?: React.ReactNode;
}

export default function ProfileSection({
  icon,
  iconColor = "bg-primary/10 text-primary",
  title,
  subtitle,
  children,
  defaultOpen = false,
  collapsible = true,
  action,
}: ProfileSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={!collapsible}
        className={`
          w-full flex items-center justify-between p-4 lg:p-5
          ${collapsible ? "hover:bg-dark-hover cursor-pointer" : "cursor-default"}
          transition-colors duration-200
        `}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>

          {/* Title & subtitle */}
          <div className="text-left">
            <h3 className="font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action button */}
          {action && (
            <div onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}

          {/* Chevron */}
          {collapsible && (
            <motion.svg
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {(isOpen || !collapsible) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
