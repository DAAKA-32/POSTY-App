"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls, PanInfo } from "framer-motion";
import { X, Sparkles, ArrowRight, Check } from "lucide-react";
import { PostTemplate } from "./PostTemplates";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplateFillerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filledTemplate: string) => void;
  template: PostTemplate | null;
}

/**
 * Extract placeholders from template text
 * Matches patterns like [placeholder text]
 */
function extractPlaceholders(template: string): string[] {
  const regex = /\[([^\]]+)\]/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Avoid duplicates
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  return matches;
}

/**
 * Generate a human-readable label from placeholder text
 */
function generateLabel(placeholder: string): string {
  // Capitalize first letter
  return placeholder.charAt(0).toUpperCase() + placeholder.slice(1);
}

/**
 * Generate placeholder hint for input (uses translation keys)
 */
function generateHint(placeholder: string, hints: Record<string, string>, fillIn: string): string {
  return hints[placeholder] || `${fillIn} ${placeholder}`;
}

/** Detect mobile viewport (<640px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// Dismiss threshold: drag 25% of screen height or with velocity > 500
const DISMISS_THRESHOLD = 0.25;
const VELOCITY_THRESHOLD = 500;

/**
 * TemplateFillerModal - Interactive template filling modal
 *
 * Features:
 * - iOS-native bottom sheet on mobile (slide-up, drag handle, swipe-to-dismiss)
 * - Centered modal on desktop (fade/scale)
 * - Dynamic field extraction from template
 * - Real-time preview of filled template
 * - Keyboard navigation support
 * - Auto-focus on first field
 * - Spring-based animations for premium feel
 */
export default function TemplateFillerModal({
  isOpen,
  onClose,
  onSubmit,
  template,
}: TemplateFillerModalProps) {
  const { t } = useLanguage();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  useScrollLock(isOpen);

  // Translated template name/description
  const templateName = template ? ((t.templates as unknown as Record<string, unknown>)[template.id] as string || template.name) : "";
  const templateDescription = template ? ((t.templates as unknown as Record<string, unknown>)[`${template.id}Desc`] as string || template.description) : "";
  const hints = (t.templates.hints || {}) as Record<string, string>;

  // Drag-to-dismiss (mobile only)
  const dragControls = useDragControls();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(
    dragY,
    [0, typeof window !== "undefined" ? window.innerHeight * 0.4 : 400],
    [1, 0]
  );

  // Mount check for portal (client-side only)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Extract placeholders from template
  const placeholders = useMemo(() => {
    if (!template) return [];
    return extractPlaceholders(template.template);
  }, [template]);

  // Reset state when template changes
  useEffect(() => {
    if (template && isOpen) {
      setFieldValues({});
      setCurrentStep(0);
      setIsSubmitting(false);
      dragY.set(0);
    }
  }, [template, isOpen, dragY]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, isMobile ? 500 : 300);
    }
  }, [isOpen, isMobile]);

  // Background blur class (visual only, scroll handled by useScrollLock)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("template-modal-open");
    } else {
      document.body.classList.remove("template-modal-open");
    }
    return () => {
      document.body.classList.remove("template-modal-open");
    };
  }, [isOpen]);

  // Handle field change
  const handleFieldChange = useCallback((placeholder: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [placeholder]: value,
    }));
  }, []);

  // Generate filled template
  const generateFilledTemplate = useCallback(() => {
    if (!template) return "";

    let result = template.template;
    placeholders.forEach(placeholder => {
      const value = fieldValues[placeholder] || `[${placeholder}]`;
      result = result.replace(new RegExp(`\\[${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'), value);
    });

    return result;
  }, [template, placeholders, fieldValues]);

  // Check if all required fields are filled
  const isComplete = useMemo(() => {
    return placeholders.every(p => fieldValues[p]?.trim());
  }, [placeholders, fieldValues]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!isComplete) return;

    setIsSubmitting(true);
    const filledTemplate = generateFilledTemplate();

    // Small delay for animation
    setTimeout(() => {
      onSubmit(filledTemplate);
      onClose();
    }, 300);
  }, [isComplete, generateFilledTemplate, onSubmit, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < placeholders.length - 1) {
        // Move to next field
        const nextInput = document.querySelector<HTMLInputElement>(
          `[data-field-index="${index + 1}"]`
        );
        nextInput?.focus();
      } else if (isComplete) {
        // Submit on last field
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [placeholders.length, isComplete, handleSubmit, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Mobile: handle drag end for swipe-to-dismiss
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const screenH = window.innerHeight;
    const draggedRatio = info.offset.y / screenH;
    const velocity = info.velocity.y;

    if (draggedRatio > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose();
    } else {
      // Snap back with spring
      dragY.set(0);
    }
  }, [onClose, dragY]);

  // Progress percentage
  const progress = useMemo(() => {
    const filledCount = placeholders.filter(p => fieldValues[p]?.trim()).length;
    return Math.round((filledCount / placeholders.length) * 100);
  }, [placeholders, fieldValues]);

  if (!template || !mounted) return null;

  // ── Shared content (fields, preview, footer) ──

  const headerContent = (
    <div className={`relative flex-shrink-0 px-5 sm:px-6 pb-4 pt-0 sm:pt-5 ${template.bgColor} border-b ${template.borderColor}`}>
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${template.color} opacity-10 ${isMobile ? "rounded-t-[20px]" : ""}`} />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <span className="text-xl sm:text-2xl">{template.icon}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
              {templateName}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-text-secondary truncate">
              {templateDescription}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0 ml-2"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-text-muted" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative mt-3 sm:mt-4 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${template.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1.5 sm:mt-2 text-xs text-gray-500 dark:text-text-muted text-right">
        {progress}% {t.templates.percentComplete}
      </p>
    </div>
  );

  const fieldsContent = (
    <div className="px-5 sm:px-6 py-4">
      <div className="space-y-4">
        {placeholders.map((placeholder, index) => (
          <motion.div
            key={placeholder}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <label className="flex items-center justify-between mb-1.5 text-sm font-medium text-gray-700 dark:text-text-secondary">
              <span className="flex items-center">
                <span className={`inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold rounded-full bg-gradient-to-r ${template.color} text-white`}>
                  {index + 1}
                </span>
                {generateLabel(placeholder)}
              </span>
              {/* Inline completion badge - no layout shift */}
              <AnimatePresence mode="wait">
                {fieldValues[placeholder]?.trim() && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="w-3 h-3" />
                    <span>{t.templates.completed}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </label>
            <div className="relative">
              <input
                ref={index === 0 ? firstInputRef : undefined}
                data-field-index={index}
                type="text"
                value={fieldValues[placeholder] || ""}
                onChange={(e) => handleFieldChange(placeholder, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={generateHint(placeholder, hints, t.templates.fillIn)}
                className={`
                  w-full px-4 py-3 pr-10 rounded-xl
                  bg-gray-50 dark:bg-dark-bg
                  border-2 transition-all duration-200
                  ${fieldValues[placeholder]?.trim()
                    ? `${template.borderColor} bg-white dark:bg-dark-elevated`
                    : "border-gray-200 dark:border-dark-border"
                  }
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  placeholder:text-gray-400 dark:placeholder:text-text-muted
                  text-gray-900 dark:text-white
                  text-[16px] sm:text-sm
                `}
              />
              {/* Subtle checkmark inside input - absolute positioned */}
              <AnimatePresence>
                {fieldValues[placeholder]?.trim() && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const previewContent = (
    <AnimatePresence>
      {progress > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-5 sm:px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-gray-700 dark:text-text-secondary">
              {t.templates.livePreview}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-text-secondary whitespace-pre-wrap">
              {generateFilledTemplate()}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const footerContent = (
    <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border"
      style={isMobile ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="px-4 sm:px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {t.templates.cancel}
        </button>

        <motion.button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          whileHover={isComplete ? { scale: 1.02 } : {}}
          whileTap={isComplete ? { scale: 0.98 } : {}}
          className={`
            flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl
            text-sm font-semibold text-white
            transition-all duration-200
            ${isComplete
              ? `bg-gradient-to-r ${template.color} hover:shadow-lg hover:shadow-primary/25`
              : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
              <span>{t.templates.generating}</span>
            </>
          ) : (
            <>
              <span>{t.templates.useTemplate}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );

  // ── Mobile: iOS bottom sheet ──
  if (isMobile) {
    const mobileContent = (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100]"
            onClick={handleBackdropClick}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50"
              style={{ opacity: backdropOpacity }}
            />

            {/* Bottom Sheet */}
            <motion.div
              ref={modalRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300, mass: 0.8 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute bottom-0 left-0 right-0 flex flex-col bg-white dark:bg-dark-card rounded-t-[20px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)]"
              style={{ y: dragY, maxHeight: "92vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle - triggers sheet drag */}
              <div
                className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-9 h-[5px] rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Header */}
              {headerContent}

              {/* Scrollable Content Area */}
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {fieldsContent}
                {previewContent}
              </div>

              {/* Footer */}
              {footerContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );

    return createPortal(mobileContent, document.body);
  }

  // ── Desktop: centered modal ──
  const desktopContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-dark-card rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {headerContent}

            {/* Scrollable Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {fieldsContent}
              {previewContent}
            </div>

            {/* Footer */}
            {footerContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render via portal to document.body (outside app-layout blur scope)
  return createPortal(desktopContent, document.body);
}
