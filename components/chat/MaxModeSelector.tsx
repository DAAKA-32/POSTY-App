"use client";

import { motion } from "framer-motion";
import { Layers, MessageSquare, Briefcase } from "lucide-react";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

type MaxMode = "dual" | "storytelling" | "business";

interface MaxModeSelectorProps {
  selectedMode: MaxMode;
  onModeChange: (mode: MaxMode) => void;
  className?: string;
}

const MODE_ICONS = {
  dual: Layers,
  storytelling: MessageSquare,
  business: Briefcase,
} as const;

const MODE_ORDER: MaxMode[] = ["dual", "storytelling", "business"];

export default function MaxModeSelector({
  selectedMode,
  onModeChange,
  className = "",
}: MaxModeSelectorProps) {
  const { t } = useLanguage();

  const handleSelect = (mode: MaxMode) => {
    if (mode === selectedMode) return;
    onModeChange(mode);
    toast.info(t.chat.modeActivated[mode]);
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-dark-elevated border border-border-primary ${className}`}
    >
      {MODE_ORDER.map((modeId) => {
        const Icon = MODE_ICONS[modeId];
        const isActive = selectedMode === modeId;

        return (
          <button
            key={modeId}
            type="button"
            onClick={() => handleSelect(modeId)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium transition-colors duration-200 cursor-pointer
              ${isActive ? "text-primary" : "text-text-muted hover:text-text-secondary"}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="maxModeIndicator"
                className="absolute inset-0 bg-primary/15 border border-primary/30 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.chat.modeLabel[modeId]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
