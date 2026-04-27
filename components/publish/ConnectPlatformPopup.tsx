"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Platform } from "@/types";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";

interface ConnectPlatformPopupProps {
  isOpen: boolean;
  platform: Platform | null;
  platformName: string;
  platformIcon: React.ReactNode;
  platformColor: string;
  platformBgColor: string;
  onClose: () => void;
  onConnect: () => void;
}

export default function ConnectPlatformPopup({
  isOpen,
  platform,
  platformName,
  platformIcon,
  platformColor,
  platformBgColor,
  onClose,
  onConnect,
}: ConnectPlatformPopupProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const handleConnect = () => {
    triggerHaptic("medium");
    onConnect();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && platform && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.publish.connectPlatformTitle.replace("{platform}", platformName)}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="relative w-full max-w-xs bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-elevated overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div
                className={`w-14 h-14 mx-auto mb-3 rounded-2xl ${platformBgColor} flex items-center justify-center ${platformColor}`}
              >
                <div className="scale-150">{platformIcon}</div>
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1.5">
                {t.publish.connectPlatformTitle.replace("{platform}", platformName)}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t.publish.connectPlatformDesc.replace("{platform}", platformName)}
              </p>
            </div>

            <div className="flex gap-2 p-3 border-t border-light-border dark:border-dark-border bg-background-warm/40 dark:bg-dark-bg/40">
              <Button
                variant="secondary"
                fullWidth
                onClick={onClose}
                className="min-h-[44px]"
              >
                {t.templates.cancel}
              </Button>
              <Button
                fullWidth
                onClick={handleConnect}
                className="min-h-[44px] bg-primary hover:bg-primary-hover border-none"
              >
                {t.publish.connectAction}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
