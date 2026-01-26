"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface IOSTimePickerProps {
  value: { hour: number; minute: number };
  onChange: (value: { hour: number; minute: number }) => void;
  minuteStep?: 5 | 10 | 15 | 30;
  variant?: "light" | "dark" | "auto";
}

// Generate hours array (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Generate minutes based on step
const generateMinutes = (step: number) => {
  const minutes: number[] = [];
  for (let i = 0; i < 60; i += step) {
    minutes.push(i);
  }
  return minutes;
};

// Item height for calculations - Increased for better touch targets
const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Single wheel component with premium iOS-style design
const Wheel = memo(function Wheel({
  items,
  value,
  onChange,
  formatValue,
  isDark = true,
}: {
  items: number[];
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  isDark?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const { trigger: triggerHaptic } = useHapticFeedback();
  const lastValueRef = useRef(value);
  const isDraggingRef = useRef(false);

  // Calculate current index
  const currentIndex = items.indexOf(value);
  const [offset, setOffset] = useState(-currentIndex * ITEM_HEIGHT);

  // Update offset when value changes externally
  useEffect(() => {
    if (!isDraggingRef.current) {
      const newIndex = items.indexOf(value);
      setOffset(-newIndex * ITEM_HEIGHT);
    }
  }, [value, items]);

  // Snap to nearest item
  const snapToNearest = useCallback(
    (currentOffset: number) => {
      const index = Math.round(-currentOffset / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const newOffset = -clampedIndex * ITEM_HEIGHT;

      setOffset(newOffset);
      controls.start({
        y: newOffset,
        transition: { type: "spring", stiffness: 400, damping: 35 },
      });

      const newValue = items[clampedIndex];
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        triggerHaptic("light");
        onChange(newValue);
      }
    },
    [items, onChange, controls, triggerHaptic]
  );

  // Handle drag
  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      isDraggingRef.current = true;
      const newOffset = offset + info.delta.y;
      setOffset(newOffset);

      // Check if crossed a threshold for haptic
      const currentIndex = Math.round(-newOffset / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, currentIndex));
      const currentValue = items[clampedIndex];

      if (currentValue !== lastValueRef.current) {
        lastValueRef.current = currentValue;
        triggerHaptic("selection");
      }
    },
    [offset, items, triggerHaptic]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      isDraggingRef.current = false;

      // Calculate final offset with velocity
      const velocity = info.velocity.y;
      const projectedOffset = offset + velocity * 0.15;

      snapToNearest(projectedOffset);
    },
    [offset, snapToNearest]
  );

  // Calculate opacity for each item based on distance from center
  const getItemStyle = (index: number) => {
    const centerOffset = PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2;
    const itemPosition = index * ITEM_HEIGHT + offset + centerOffset;
    const distanceFromCenter = Math.abs(itemPosition - centerOffset);
    const maxDistance = PICKER_HEIGHT / 2;

    const opacity = Math.max(0.2, 1 - distanceFromCenter / maxDistance);
    const scale = Math.max(0.85, 1 - distanceFromCenter / (maxDistance * 2));
    const blur = Math.min(2, distanceFromCenter / maxDistance * 2);

    return {
      opacity,
      transform: `scale(${scale})`,
      filter: blur > 0.5 ? `blur(${blur}px)` : "none",
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden select-none touch-pan-y"
      style={{ height: PICKER_HEIGHT }}
    >
      {/* Premium selection indicator with glassmorphism effect */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{
          top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
          height: ITEM_HEIGHT,
        }}
      >
        <div className={`h-full mx-1 rounded-2xl backdrop-blur-sm ${
          isDark
            ? "bg-primary/15 border border-primary/30 shadow-lg shadow-primary/10"
            : "bg-primary/10 border border-primary/25 shadow-md shadow-primary/10"
        }`} />
      </div>

      {/* Premium gradient overlays for fade effect */}
      <div className={`absolute inset-x-0 top-0 h-20 pointer-events-none z-20 ${
        isDark
          ? "bg-gradient-to-b from-dark-card via-dark-card/95 to-transparent"
          : "bg-gradient-to-b from-white via-white/95 to-transparent"
      }`} />
      <div className={`absolute inset-x-0 bottom-0 h-20 pointer-events-none z-20 ${
        isDark
          ? "bg-gradient-to-t from-dark-card via-dark-card/95 to-transparent"
          : "bg-gradient-to-t from-white via-white/95 to-transparent"
      }`} />

      {/* Scrollable content */}
      <motion.div
        className="absolute inset-x-0 cursor-grab active:cursor-grabbing"
        style={{ y: offset }}
        drag="y"
        dragConstraints={{
          top: -(items.length - 1) * ITEM_HEIGHT,
          bottom: 0,
        }}
        dragElastic={0.08}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        {/* Padding for centering first/last items */}
        <div style={{ height: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2 }} />

        {items.map((item, index) => (
          <div
            key={item}
            className={`flex items-center justify-center font-bold text-3xl tabular-nums transition-all duration-100 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            style={{
              height: ITEM_HEIGHT,
              ...getItemStyle(index),
            }}
          >
            {formatValue(item)}
          </div>
        ))}

        {/* Padding for centering last item */}
        <div style={{ height: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2 }} />
      </motion.div>
    </div>
  );
});

// Main iOS Time Picker component - Premium Apple-inspired design
export default function IOSTimePicker({
  value,
  onChange,
  minuteStep = 5,
  variant = "dark",
}: IOSTimePickerProps) {
  const minutes = generateMinutes(minuteStep);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Determine if dark mode based on variant
  const isDark = variant === "dark" || (variant === "auto" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Find nearest valid minute
  const nearestMinute = minutes.reduce((prev, curr) =>
    Math.abs(curr - value.minute) < Math.abs(prev - value.minute) ? curr : prev
  );

  const handleHourChange = (hour: number) => {
    onChange({ ...value, hour });
  };

  const handleMinuteChange = (minute: number) => {
    onChange({ ...value, minute });
  };

  const formatHour = (h: number) => h.toString().padStart(2, "0");
  const formatMinute = (m: number) => m.toString().padStart(2, "0");

  return (
    <div className={`rounded-2xl overflow-hidden shadow-xl ${
      isDark
        ? "bg-dark-card border border-dark-border"
        : "bg-white border border-gray-200/80 shadow-gray-200/50"
    }`}>
      {/* Header - Premium styling */}
      <div className={`px-4 py-3.5 border-b ${
        isDark
          ? "border-dark-border bg-dark-elevated/50"
          : "border-gray-100 bg-gray-50/50"
      }`}>
        <p className={`text-sm text-center font-semibold ${
          isDark ? "text-text-muted" : "text-gray-500"
        }`}>
          Sélectionnez l'heure
        </p>
      </div>

      {/* Picker wheels - Premium layout */}
      <div className="flex items-center justify-center px-6 py-4">
        {/* Hours wheel */}
        <div className="flex-1 max-w-[110px]">
          <Wheel
            items={HOURS}
            value={value.hour}
            onChange={handleHourChange}
            formatValue={formatHour}
            isDark={isDark}
          />
        </div>

        {/* Premium animated separator */}
        <div className="relative mx-3 flex flex-col items-center justify-center h-[48px]">
          <motion.span
            className={`text-4xl font-bold ${
              isDark ? "text-primary" : "text-primary"
            }`}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            :
          </motion.span>
        </div>

        {/* Minutes wheel */}
        <div className="flex-1 max-w-[110px]">
          <Wheel
            items={minutes}
            value={nearestMinute}
            onChange={handleMinuteChange}
            formatValue={formatMinute}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Current selection display - Premium footer */}
      <div className={`px-4 py-4 border-t ${
        isDark
          ? "border-dark-border bg-gradient-to-r from-dark-elevated/50 via-primary/5 to-dark-elevated/50"
          : "border-gray-100 bg-gradient-to-r from-gray-50/50 via-primary/5 to-gray-50/50"
      }`}>
        <div className="flex items-center justify-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isDark ? "bg-primary" : "bg-primary"} animate-pulse`} />
          <p className="text-center">
            <span className={`text-sm ${isDark ? "text-text-muted" : "text-gray-500"}`}>
              Heure sélectionnée:{" "}
            </span>
            <span className={`font-bold text-xl tabular-nums ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {formatHour(value.hour)}:{formatMinute(nearestMinute)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Smart time suggestions component - Premium design with light/dark support
interface SmartTimeSuggestionsProps {
  onSelect: (hour: number, minute: number) => void;
  selectedHour?: number;
  selectedMinute?: number;
  selectedDate?: Date;
  isTimeDisabled?: (hour: number, minute: number) => boolean;
  variant?: "light" | "dark";
}

export function SmartTimeSuggestions({
  onSelect,
  selectedHour,
  selectedMinute,
  selectedDate,
  isTimeDisabled,
  variant = "dark",
}: SmartTimeSuggestionsProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();
  const isDark = variant === "dark";

  const suggestions = [
    {
      hour: 8,
      minute: 0,
      label: "8h00",
      reason: "Début de journée",
      emoji: "🌅",
      engagement: "Bon",
      engagementScore: 60,
    },
    {
      hour: 9,
      minute: 30,
      label: "9h30",
      reason: "Pause café",
      emoji: "☕",
      engagement: "Très bon",
      engagementScore: 80,
    },
    {
      hour: 12,
      minute: 0,
      label: "12h00",
      reason: "Pause déjeuner",
      emoji: "🍽️",
      engagement: "Excellent",
      engagementScore: 100,
      recommended: true,
    },
    {
      hour: 17,
      minute: 30,
      label: "17h30",
      reason: "Fin de journée",
      emoji: "🌇",
      engagement: "Très bon",
      engagementScore: 85,
    },
    {
      hour: 19,
      minute: 0,
      label: "19h00",
      reason: "Soirée",
      emoji: "🌙",
      engagement: "Bon",
      engagementScore: 65,
    },
  ];

  const handleSelect = (hour: number, minute: number, disabled: boolean) => {
    if (disabled) {
      triggerHaptic("error");
      return;
    }
    triggerHaptic("medium");
    onSelect(hour, minute);
  };

  // Check if all suggestions are disabled
  const allDisabled = isTimeDisabled
    ? suggestions.every(s => isTimeDisabled(s.hour, s.minute))
    : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          isDark ? "bg-primary/15" : "bg-primary/10"
        }`}>
          <span className="text-lg">💡</span>
        </div>
        <div>
          <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Horaires recommandés
          </p>
          <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"}`}>
            Meilleurs moments pour LinkedIn
          </p>
        </div>
      </div>

      {allDisabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border ${
            isDark
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-amber-50 border-amber-200/50"
          }`}
        >
          <svg className={`w-5 h-5 shrink-0 ${isDark ? "text-amber-400" : "text-amber-600"}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className={`text-xs ${isDark ? "text-amber-400" : "text-amber-700"}`}>
            Tous les créneaux recommandés sont passés. Sélectionnez une heure manuellement.
          </p>
        </motion.div>
      )}

      {/* Suggestions grid - Premium cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {suggestions.map((suggestion, index) => {
          const isSelected =
            selectedHour === suggestion.hour &&
            selectedMinute === suggestion.minute;
          const isDisabled = isTimeDisabled
            ? isTimeDisabled(suggestion.hour, suggestion.minute)
            : false;

          return (
            <motion.button
              key={suggestion.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelect(suggestion.hour, suggestion.minute, isDisabled)}
              disabled={isDisabled}
              title={isDisabled ? "Créneau passé" : undefined}
              whileTap={!isDisabled ? { scale: 0.97 } : {}}
              className={`
                relative p-3.5 rounded-xl border transition-all duration-200
                text-left group overflow-hidden
                ${isDisabled
                  ? isDark
                    ? "opacity-40 cursor-not-allowed bg-dark-elevated/30 border-dark-border/50"
                    : "opacity-40 cursor-not-allowed bg-gray-100/50 border-gray-200/50"
                  : isSelected
                    ? isDark
                      ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                      : "bg-primary/15 border-primary shadow-lg shadow-primary/15"
                    : isDark
                      ? "bg-dark-elevated border-dark-border hover:border-primary/50 hover:bg-dark-hover hover:shadow-md"
                      : "bg-white border-gray-200 hover:border-primary/40 hover:shadow-md hover:bg-gray-50/50"
                }
                ${suggestion.recommended && !isDisabled
                  ? isDark
                    ? "ring-1 ring-primary/40 shadow-md shadow-primary/10"
                    : "ring-1 ring-primary/30 shadow-md shadow-primary/10"
                  : ""
                }
              `}
            >
              {/* Recommended badge */}
              {suggestion.recommended && !isDisabled && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-primary to-accent text-white rounded-full shadow-lg"
                >
                  TOP
                </motion.span>
              )}

              {/* Disabled indicator */}
              {isDisabled && (
                <span className={`absolute top-2 right-2 text-xs ${isDark ? "text-text-muted" : "text-gray-400"}`}>
                  ⏰
                </span>
              )}

              <div className="flex items-start gap-2.5">
                <span className={`text-2xl ${isDisabled ? "grayscale opacity-50" : ""}`}>
                  {suggestion.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-lg tabular-nums ${
                    isDisabled
                      ? isDark ? "text-text-muted line-through" : "text-gray-400 line-through"
                      : isSelected
                        ? isDark ? "text-white" : "text-gray-900"
                        : isDark ? "text-white" : "text-gray-900"
                  }`}>
                    {suggestion.label}
                  </p>
                  <p className={`text-xs truncate ${
                    isDark ? "text-text-muted" : "text-gray-500"
                  }`}>
                    {isDisabled ? "Passé" : suggestion.reason}
                  </p>
                </div>
              </div>

              {/* Premium engagement indicator bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${
                  isDark ? "bg-dark-border" : "bg-gray-200"
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isDisabled ? "0%" : `${suggestion.engagementScore}%` }}
                    transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      isDisabled
                        ? "bg-transparent"
                        : suggestion.engagementScore === 100
                          ? "bg-gradient-to-r from-primary via-accent to-primary"
                          : suggestion.engagementScore >= 80
                            ? "bg-primary"
                            : "bg-primary/60"
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium min-w-[50px] text-right ${
                  isDark ? "text-text-muted" : "text-gray-500"
                }`}>
                  {isDisabled ? "—" : suggestion.engagement}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
