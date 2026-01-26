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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-orange-200 dark:hover:border-primary/20 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:shadow-[0_0_30px_rgba(232,147,77,0.08)]"
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={!collapsible}
        className={`
          w-full flex items-center justify-between p-4 lg:p-5
          ${collapsible ? "hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer" : "cursor-default"}
          transition-colors duration-200
        `}
      >
        <div className="flex items-center gap-3">
          {/* Icon with premium gradient */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor} border border-orange-200 dark:border-primary/10 group-hover:shadow-glow transition-shadow duration-300`}>
            {icon}
          </div>

          {/* Title & subtitle */}
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-text-muted">{subtitle}</p>
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
              className="w-5 h-5 text-gray-400 dark:text-text-muted"
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
