"use client";

import { motion } from "framer-motion";
import { useState, useCallback } from "react";

interface RefineSliderProps {
  value: number;
  onChange: (value: number) => void;
  onApply?: () => void;
  className?: string;
}

/**
 * RefineSlider - Formality/Tone adjustment slider
 *
 * Features:
 * - Smooth slider from Casual to Formal
 * - Visual feedback with icons and labels
 * - Tooltip showing current value
 * - Apply button for refinement
 */
export default function RefineSlider({
  value,
  onChange,
  onApply,
  className = "",
}: RefineSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Tone labels based on slider position
  const getToneLabel = (val: number): string => {
    if (val <= 20) return "Très décontracté";
    if (val <= 40) return "Décontracté";
    if (val <= 60) return "Équilibré";
    if (val <= 80) return "Professionnel";
    return "Très formel";
  };

  // Tone emoji based on slider position
  const getToneEmoji = (val: number): string => {
    if (val <= 20) return "😊";
    if (val <= 40) return "🙂";
    if (val <= 60) return "😐";
    if (val <= 80) return "🎩";
    return "👔";
  };

  // Color gradient based on slider position
  const getGradientPosition = (val: number): string => {
    return `${val}%`;
  };

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className={`p-4 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Mode Refine
            </h3>
            <p className="text-xs text-gray-500 dark:text-text-muted">
              Ajustez le ton de votre post
            </p>
          </div>
        </div>

        {/* Current Tone Badge */}
        <motion.div
          key={getToneLabel(value)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
        >
          <span className="text-base">{getToneEmoji(value)}</span>
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {getToneLabel(value)}
          </span>
        </motion.div>
      </div>

      {/* Slider Container */}
      <div className="relative py-4">
        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-400 dark:text-text-muted mb-3">
          <span>😊 Casual</span>
          <span>👔 Formel</span>
        </div>

        {/* Custom Slider Track */}
        <div className="relative h-3 rounded-full bg-gray-100 dark:bg-dark-bg overflow-hidden">
          {/* Gradient Fill */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-600"
            style={{ width: getGradientPosition(value) }}
            animate={{ width: getGradientPosition(value) }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {/* Native Range Input (invisible but functional) */}
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {/* Custom Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-lg border-2 border-violet-500 flex items-center justify-center cursor-grab active:cursor-grabbing z-5"
            style={{ left: `calc(${value}% - 12px)` }}
            animate={{
              scale: isDragging ? 1.2 : 1,
              boxShadow: isDragging
                ? "0 0 0 8px rgba(139, 92, 246, 0.2)"
                : "0 2px 8px rgba(0,0,0,0.15)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span className="text-xs">{getToneEmoji(value)}</span>
          </motion.div>
        </div>

        {/* Value Tooltip (shows when dragging) */}
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-xs font-medium"
            style={{ left: `${value}%` }}
          >
            {value}%
          </motion.div>
        )}
      </div>

      {/* Presets */}
      <div className="flex gap-2 mt-4">
        {[
          { label: "Casual", value: 20, emoji: "😊" },
          { label: "Équilibré", value: 50, emoji: "😐" },
          { label: "Pro", value: 80, emoji: "🎩" },
        ].map((preset) => (
          <motion.button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex-1 px-3 py-2 rounded-lg text-xs font-medium
              transition-all duration-200
              ${Math.abs(value - preset.value) < 15
                ? "bg-violet-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-text-secondary hover:bg-gray-200 dark:hover:bg-dark-hover"
              }
            `}
          >
            <span className="mr-1">{preset.emoji}</span>
            {preset.label}
          </motion.button>
        ))}
      </div>

      {/* Apply Button */}
      {onApply && (
        <motion.button
          onClick={onApply}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-shadow"
        >
          Appliquer le ton
        </motion.button>
      )}
    </div>
  );
}

/**
 * CompactRefineSlider - Inline version for integration in chat input
 */
export function CompactRefineSlider({
  value,
  onChange,
  className = "",
}: Omit<RefineSliderProps, "onApply">) {
  const getToneEmoji = (val: number): string => {
    if (val <= 20) return "😊";
    if (val <= 40) return "🙂";
    if (val <= 60) return "😐";
    if (val <= 80) return "🎩";
    return "👔";
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-gray-500 dark:text-text-muted">Ton:</span>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm">😊</span>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 dark:bg-dark-bg rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-violet-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:active:cursor-grabbing
          "
        />
        <span className="text-sm">👔</span>
      </div>
      <span className="text-lg">{getToneEmoji(value)}</span>
    </div>
  );
}
