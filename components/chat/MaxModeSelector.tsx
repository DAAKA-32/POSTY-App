"use client";

import { motion } from "framer-motion";
import { Layers, MessageSquare, Briefcase } from "lucide-react";
import toast from "@/components/ui/Toast";

type MaxMode = "dual" | "storytelling" | "business";

interface MaxModeSelectorProps {
  selectedMode: MaxMode;
  onModeChange: (mode: MaxMode) => void;
  className?: string;
}

const MODES = [
  {
    id: "dual" as const,
    label: "Double Réponse",
    icon: Layers,
    toast: "Mode Double Réponse activé",
  },
  {
    id: "storytelling" as const,
    label: "Storytelling",
    icon: MessageSquare,
    toast: "Mode Storytelling activé",
  },
  {
    id: "business" as const,
    label: "Business",
    icon: Briefcase,
    toast: "Mode Business activé",
  },
];

export default function MaxModeSelector({
  selectedMode,
  onModeChange,
  className = "",
}: MaxModeSelectorProps) {
  const handleSelect = (mode: MaxMode) => {
    if (mode === selectedMode) return;
    onModeChange(mode);
    const modeConfig = MODES.find((m) => m.id === mode);
    if (modeConfig) toast.info(modeConfig.toast);
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-dark-elevated border border-border-primary ${className}`}
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleSelect(mode.id)}
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
              <span className="hidden sm:inline">{mode.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
