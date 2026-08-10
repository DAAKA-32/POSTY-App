"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  languageNames,
  languageFlags,
  languageShort,
  type Language,
} from "@/lib/i18n";
import { menuContainerVariants, menuRowVariants, transition } from "@/lib/motion";

/**
 * LanguageSelector — the single, reusable language picker used everywhere in
 * Posty (navbars, settings, onboarding, mobile menus…). Closed by default it
 * shows only the current language; the full list appears only on open, and the
 * menu closes on selection.
 *
 * Two variants:
 *   • "compact" — pill trigger (flag + short code + chevron) for navbars.
 *   • "block"   — full-width trigger (flag + full name + chevron) for settings
 *                 cards and mobile menus.
 *
 * The menu is rendered in a PORTAL to document.body with `position: fixed`,
 * anchored to the trigger. This escapes every ancestor stacking context (motion
 * sections, transformed cards, `overflow` containers…) so it always paints ABOVE
 * the page instead of behind sibling elements. It flips upward when there isn't
 * enough room below and is clamped inside the viewport (no horizontal overflow).
 * `setLanguage` is unchanged, so i18n persistence keeps working exactly as before.
 */

const LANG_CODES = Object.keys(languageNames) as Language[];
const COMPACT_WIDTH = 208; // px — matches the old w-52 menu.
const GAP = 8;

interface LanguageSelectorProps {
  variant?: "compact" | "block";
  /** Horizontal edge the menu aligns to. Defaults: compact→end, block→start. */
  align?: "start" | "end";
  /** Extra classes merged onto the trigger button. */
  className?: string;
  /** Fired after the language is applied (e.g. to show a toast). */
  onSelect?: (lang: Language) => void;
}

interface MenuPos {
  left: number;
  width: number;
  openUp: boolean;
  top: number;
  bottom: number;
}

export default function LanguageSelector({
  variant = "compact",
  align,
  className = "",
  onSelect,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const isBlock = variant === "block";
  const resolvedAlign = align ?? (isBlock ? "start" : "end");

  useEffect(() => setMounted(true), []);

  // Anchor the fixed menu to the trigger; flip up near the screen bottom and
  // clamp horizontally so it never leaves the viewport.
  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const width = isBlock ? r.width : COMPACT_WIDTH;
    const estimated = Math.min(LANG_CODES.length * 44 + 12, 320);
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < estimated && spaceAbove > spaceBelow;
    let left = resolvedAlign === "end" && !isBlock ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({
      left,
      width,
      openUp,
      top: r.bottom + GAP,
      bottom: window.innerHeight - r.top + GAP,
    });
  }, [isBlock, resolvedAlign]);

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      computePosition();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const onReflow = () => computePosition();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [isOpen, computePosition]);

  const choose = (code: Language) => {
    setLanguage(code);
    onSelect?.(code);
    setIsOpen(false);
  };

  return (
    <div className={isBlock ? "w-full" : "inline-flex"}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${languageNames[language]} — change language`}
        className={
          isBlock
            ? `w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left
               bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border
               hover:border-gray-300 dark:hover:border-dark-border-hover
               transition-colors duration-200
               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`
            : `inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-medium
               text-gray-500 hover:text-gray-900 hover:bg-gray-100
               dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/[0.06]
               transition-colors duration-200
               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`
        }
      >
        <span className={isBlock ? "text-xl shrink-0" : "text-base shrink-0"} aria-hidden="true">
          {languageFlags[language]}
        </span>
        <span
          className={
            isBlock
              ? "flex-1 font-medium text-sm lg:text-base text-gray-900 dark:text-white truncate"
              : ""
          }
        >
          {isBlock ? languageNames[language] : languageShort[language]}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={transition.springSnappy}
          className={`${isBlock ? "w-4 h-4 ml-auto" : "w-3 h-3"} shrink-0 text-text-muted`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && pos && (
              <motion.ul
                ref={menuRef}
                variants={menuContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="listbox"
                style={{
                  position: "fixed",
                  left: pos.left,
                  width: pos.width,
                  maxWidth: "calc(100vw - 16px)",
                  ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
                  transformOrigin: pos.openUp ? "bottom center" : "top center",
                  willChange: "transform, opacity",
                  zIndex: 9999,
                }}
                className="
                  py-1 rounded-xl overflow-y-auto no-scrollbar
                  bg-white dark:bg-dark-elevated
                  border border-gray-200 dark:border-dark-border
                  shadow-[0_12px_40px_rgba(15,17,21,0.14),0_2px_10px_rgba(15,17,21,0.08)]
                  dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]
                  max-h-[min(20rem,60vh)]
                "
              >
                {LANG_CODES.map((code) => {
                  const active = code === language;
                  return (
                    <motion.li key={code} variants={menuRowVariants} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => choose(code)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left
                          transition-colors duration-150
                          ${active
                            ? "bg-[#F8935D]/10 text-[#F8935D] font-semibold"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                          }
                        `}
                      >
                        <span className="text-base shrink-0" aria-hidden="true">{languageFlags[code]}</span>
                        <span className="flex-1 truncate">{languageNames[code]}</span>
                        {active && (
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
