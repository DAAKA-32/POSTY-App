"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PenLine, MessageCircle } from "lucide-react";

export type AIMode = "linkedin" | "general";

interface AIModeSwitchProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
  className?: string;
}

const MODES: { id: AIMode; label: string; labelShort: string; icon: typeof PenLine; description: string }[] = [
  {
    id: "linkedin",
    label: "Storytelling Business",
    labelShort: "LinkedIn",
    icon: PenLine,
    description: "Posts LinkedIn optimisés",
  },
  {
    id: "general",
    label: "IA Générale",
    labelShort: "IA",
    icon: MessageCircle,
    description: "Questions, conseils, support",
  },
];

export default function AIModeSwitch({
  mode,
  onModeChange,
  className = "",
}: AIModeSwitchProps) {
  const currentIndex = MODES.findIndex((m) => m.id === mode);
  const currentMode = MODES[currentIndex];
  const Icon = currentMode.icon;

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < MODES.length - 1;

  const handlePrev = () => {
    if (canGoLeft) onModeChange(MODES[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (canGoRight) onModeChange(MODES[currentIndex + 1].id);
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Left arrow */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={!canGoLeft}
        aria-label="Mode précédent"
        className={`
          flex items-center justify-center w-7 h-7 rounded-full
          transition-all duration-200
          ${canGoLeft
            ? "text-text-secondary hover:text-text-primary hover:bg-background-secondary active:scale-90 cursor-pointer"
            : "text-text-muted/30 cursor-default"
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Active mode indicator */}
      <div className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background-tertiary border border-border-primary min-w-[180px] justify-center select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-2"
          >
            <div
              className={`
                flex items-center justify-center w-5 h-5 rounded-md
                ${mode === "linkedin"
                  ? "bg-primary/15 text-primary"
                  : "bg-emerald-500/15 text-emerald-500"
                }
              `}
            >
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-text-primary leading-tight">
                {currentMode.label}
              </span>
              <span className="text-[10px] text-text-muted leading-tight">
                {currentMode.description}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right arrow */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoRight}
        aria-label="Mode suivant"
        className={`
          flex items-center justify-center w-7 h-7 rounded-full
          transition-all duration-200
          ${canGoRight
            ? "text-text-secondary hover:text-text-primary hover:bg-background-secondary active:scale-90 cursor-pointer"
            : "text-text-muted/30 cursor-default"
          }
        `}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
