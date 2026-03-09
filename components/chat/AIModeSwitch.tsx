"use client";

import { ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type AIMode = "linkedin" | "general";

interface AIModeSwitchProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
  className?: string;
}

export default function AIModeSwitch({
  mode,
  onModeChange,
  className = "",
}: AIModeSwitchProps) {
  const { t } = useLanguage();
  const toggle = () => onModeChange(mode === "linkedin" ? "general" : "linkedin");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "linkedin" ? t.ui.switchToSupportMode : t.ui.switchToCreationMode}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        text-text-muted hover:text-primary
        hover:bg-primary/10
        border border-border-primary hover:border-primary/20
        transition-all duration-200 active:scale-95
        ${className}
      `}
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
      <span className="text-[11px] font-medium">
        {mode === "linkedin" ? "Support" : "Création"}
      </span>
    </button>
  );
}
