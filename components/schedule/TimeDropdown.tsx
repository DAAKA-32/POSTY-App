"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTimeLocale } from "@/components/ui/IOSTimePicker";

interface TimeDropdownProps {
  value: { hour: number; minute: number };
  onSelect: (hour: number, minute: number) => void;
  isTimeDisabled?: (hour: number, minute: number) => boolean;
  placeholder?: string;
  defaultOpen?: boolean;
}

const RECOMMENDED: Array<{ hour: number; minute: number; emoji: string }> = [
  { hour: 8, minute: 0, emoji: "🌅" },
  { hour: 12, minute: 0, emoji: "🍽️" },
  { hour: 17, minute: 30, emoji: "🌇" },
];

const ALL_TIMES = Array.from({ length: 48 }, (_, i) => ({
  hour: Math.floor(i / 2),
  minute: (i % 2) * 30,
}));

const ROW_HEIGHT = 40;

// Spring physics for premium feel
const SPRING = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.6 };
const FAST = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

export default function TimeDropdown({
  value,
  onSelect,
  isTimeDisabled,
  placeholder,
  defaultOpen = false,
}: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { t } = useLanguage();
  const locale = t.ui.timeLocale;

  const formatted = useMemo(
    () => formatTimeLocale(value.hour, value.minute, locale),
    [value, locale]
  );

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Smooth-scroll to selected row when opening
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      const list = listRef.current;
      if (!list) return;
      const idx = value.hour * 2 + (value.minute >= 30 ? 1 : 0);
      const target = Math.max(0, idx * ROW_HEIGHT - list.clientHeight / 2 + ROW_HEIGHT / 2);
      list.scrollTo({ top: target, behavior: "smooth" });
    }, 240);
    return () => window.clearTimeout(id);
  }, [isOpen, value.hour, value.minute]);

  const toggle = () => {
    triggerHaptic("light");
    setHasInteracted(true);
    setIsOpen((v) => !v);
  };

  const handleSelect = (hour: number, minute: number) => {
    if (isTimeDisabled?.(hour, minute)) {
      triggerHaptic("error");
      return;
    }
    triggerHaptic("medium");
    onSelect(hour, minute);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="w-full">
      {/* Trigger — clean single-line with subtle pulse hint */}
      <motion.button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        whileTap={{ scale: 0.985 }}
        transition={SPRING}
        className={`
          relative w-full flex items-center justify-between gap-3
          px-4 min-h-[58px] rounded-2xl
          bg-white dark:bg-dark-elevated
          border transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
          ${isOpen
            ? "border-primary/60 dark:border-primary/60"
            : "border-gray-200 dark:border-dark-border hover:border-primary/40 dark:hover:border-primary/40"
          }
        `}
      >
        {/* Subtle attention pulse on first appearance — hints interactivity */}
        {!hasInteracted && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-2xl border border-primary/40 pointer-events-none"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 1.6, repeat: 2, repeatDelay: 0.3, ease: "easeOut" }}
          />
        )}

        <span className="flex items-center gap-3 min-w-0">
          <motion.span
            animate={{
              backgroundColor: isOpen ? "rgba(var(--color-primary-rgb,99,102,241),0.15)" : "rgba(0,0,0,0)",
            }}
            transition={FAST}
            className={`
              inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0
              transition-colors duration-200
              ${isOpen ? "text-primary bg-primary/15" : "text-text-secondary bg-gray-100 dark:bg-dark-card"}
            `}
          >
            <motion.svg
              animate={{ rotate: isOpen ? 360 : 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
          </motion.span>

          <span className="flex flex-col items-start min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted leading-none mb-1">
              {placeholder || t.scheduler.selectTime}
            </span>
            {/* Animated time value — pops slightly on change */}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={formatted}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={SPRING}
                className="text-lg font-bold text-gray-900 dark:text-white tabular-nums leading-tight"
              >
                {formatted}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0, y: isOpen ? 1 : 0 }}
          transition={SPRING}
          className={`
            inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0
            transition-colors duration-200
            ${isOpen ? "text-primary bg-primary/10" : "text-text-muted"}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </motion.button>

      {/* Inline expanding panel — height + opacity for buttery open */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.22, ease: "easeOut" },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              exit={{ y: -6 }}
              transition={FAST}
              className="mt-2 rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden shadow-sm"
            >
              {/* Recommended row — staggered chip entrance */}
              <div className="px-3 pt-3 pb-3">
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <motion.span
                    initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ ...SPRING, delay: 0.05 }}
                    className="text-[11px]"
                  >
                    💡
                  </motion.span>
                  <motion.span
                    initial={{ x: -4, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ ...FAST, delay: 0.06 }}
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                  >
                    {t.scheduler.recommendedTimes}
                  </motion.span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {RECOMMENDED.map(({ hour, minute, emoji }, i) => {
                    const disabled = isTimeDisabled?.(hour, minute) ?? false;
                    const selected = value.hour === hour && value.minute === minute;
                    return (
                      <motion.button
                        key={`rec-${hour}-${minute}`}
                        type="button"
                        onClick={() => handleSelect(hour, minute)}
                        disabled={disabled}
                        initial={{ y: 10, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ ...SPRING, delay: 0.08 + i * 0.05 }}
                        whileHover={!disabled ? { y: -2, transition: SPRING } : undefined}
                        whileTap={!disabled ? { scale: 0.94, transition: { duration: 0.08 } } : undefined}
                        className={`
                          relative flex items-center justify-center gap-1.5
                          px-2 py-2.5 rounded-xl text-sm
                          transition-colors duration-150 overflow-hidden
                          ${disabled
                            ? "opacity-40 cursor-not-allowed bg-gray-50 dark:bg-dark-elevated/40 text-text-muted line-through"
                            : selected
                              ? "bg-primary text-white font-semibold shadow-md shadow-primary/30"
                              : "bg-gray-50 dark:bg-dark-elevated text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15"
                          }
                        `}
                      >
                        {/* Selected glow */}
                        {selected && !disabled && (
                          <motion.span
                            layoutId="recommended-glow"
                            className="absolute inset-0 rounded-xl bg-primary"
                            transition={SPRING}
                          />
                        )}
                        <span className="relative z-10 text-sm leading-none">{emoji}</span>
                        <span className="relative z-10 font-semibold tabular-nums text-[13px]">
                          {formatTimeLocale(hour, minute, locale)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Divider with subtle gradient */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ ...FAST, delay: 0.18 }}
                className="h-px mx-3 bg-gradient-to-r from-transparent via-gray-200 dark:via-dark-border to-transparent origin-center"
              />

              {/* Section label */}
              <motion.div
                initial={{ x: -4, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...FAST, delay: 0.22 }}
                className="px-4 pt-3 pb-1.5"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t.scheduler.allTimes}
                </span>
              </motion.div>

              {/* Scrollable list — fade-in as a block to avoid 48-item stagger */}
              <motion.div
                ref={listRef}
                role="listbox"
                aria-label={t.scheduler.chooseTime}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...FAST, delay: 0.24 }}
                className="max-h-[240px] overflow-y-auto overscroll-contain px-2 pb-2 gpu-scroll"
                style={{ scrollbarGutter: "stable" }}
              >
                {ALL_TIMES.map(({ hour, minute }) => {
                  const disabled = isTimeDisabled?.(hour, minute) ?? false;
                  const selected = value.hour === hour && value.minute === minute;
                  return (
                    <motion.button
                      key={`${hour}-${minute}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleSelect(hour, minute)}
                      disabled={disabled}
                      whileHover={!disabled && !selected ? { x: 2, transition: { duration: 0.12 } } : undefined}
                      whileTap={!disabled ? { scale: 0.98 } : undefined}
                      style={{ height: ROW_HEIGHT }}
                      className={`
                        relative w-full flex items-center justify-between
                        px-3 rounded-lg text-sm
                        transition-colors duration-100
                        ${disabled
                          ? "opacity-40 cursor-not-allowed text-text-muted line-through"
                          : selected
                            ? "text-primary font-semibold"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover"
                        }
                      `}
                    >
                      {/* Selected row indicator — slides smoothly between items */}
                      {selected && !disabled && (
                        <motion.span
                          layoutId="row-highlight"
                          className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/25"
                          transition={SPRING}
                        />
                      )}
                      <span className="relative z-10 tabular-nums">
                        {formatTimeLocale(hour, minute, locale)}
                      </span>
                      {selected && !disabled && (
                        <motion.svg
                          initial={{ scale: 0, rotate: -45, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{ ...SPRING, delay: 0.05 }}
                          className="relative z-10 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
