"use client";

import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import ModernResponseCard from "./ModernResponseCard";
import { SubscriptionPlan } from "@/types";

interface ResponseData {
  content: string;
  variant: "storytelling" | "business";
  timestamp?: Date;
  isStreaming?: boolean;
}

interface ModernAIResponsePairProps {
  storytellingResponse: ResponseData;
  businessResponse: ResponseData;
  userPlan: SubscriptionPlan;
  onPublishToLinkedIn?: (content: string) => void;
  onSchedule?: (content: string) => void;
}

/**
 * ModernAIResponsePair - Clean dual response view for MAX plan
 *
 * Features:
 * - Side-by-side on desktop/tablet
 * - Swipeable carousel on mobile
 * - No heavy borders/blocks
 * - Subtle variant indicators
 */
export const ModernAIResponsePair = memo(function ModernAIResponsePair({
  storytellingResponse,
  businessResponse,
  userPlan,
  onPublishToLinkedIn,
  onSchedule,
}: ModernAIResponsePairProps) {
  // Mobile navigation state
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const responses = [storytellingResponse, businessResponse];
  const activeResponse = responses[activeIndex];

  // Handle swipe navigation
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (offset < -threshold || velocity < -500) {
        if (activeIndex < responses.length - 1) {
          setDirection(1);
          setActiveIndex(activeIndex + 1);
          triggerHaptic("light");
        }
      } else if (offset > threshold || velocity > 500) {
        if (activeIndex > 0) {
          setDirection(-1);
          setActiveIndex(activeIndex - 1);
          triggerHaptic("light");
        }
      }
    },
    [activeIndex, responses.length, triggerHaptic]
  );

  const handleNavigate = (dir: "next" | "prev") => {
    triggerHaptic("light");
    if (dir === "next" && activeIndex < responses.length - 1) {
      setDirection(1);
      setActiveIndex(activeIndex + 1);
    } else if (dir === "prev" && activeIndex > 0) {
      setDirection(-1);
      setActiveIndex(activeIndex - 1);
    }
  };

  // Animation variants for mobile slide
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "50%" : "-50%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-50%" : "50%",
      opacity: 0,
    }),
  };

  const variantIcons = {
    storytelling: "📖",
    business: "💼",
  };

  const variantLabels = {
    storytelling: "Storytelling",
    business: "Business",
  };

  return (
    <div className="w-full">
      {/* Desktop/Tablet: Side-by-side view */}
      <div className="hidden md:block">
        {/* Indicator that 2 versions are available - AUTOSCROLL colors enhanced */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4 text-xs font-medium"
        >
          <div className="flex items-center gap-1.5">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-2 h-2 rounded-full bg-primary-hover shadow-[0_0_8px_rgba(247,107,84,0.6)]"
            />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(248,147,93,0.6)]"
            />
          </div>
          <span className="bg-gradient-to-r from-primary-hover via-primary to-primary-hover bg-clip-text text-transparent font-semibold">
            2 versions disponibles
          </span>
        </motion.div>

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <ModernResponseCard
              content={storytellingResponse.content}
              variant="storytelling"
              timestamp={storytellingResponse.timestamp}
              isStreaming={storytellingResponse.isStreaming}
              userPlan={userPlan}
              onPublishToLinkedIn={onPublishToLinkedIn}
              onSchedule={onSchedule}
              showVariantBadge={true}
            />
          </div>
          <div>
            <ModernResponseCard
              content={businessResponse.content}
              variant="business"
              timestamp={businessResponse.timestamp}
              isStreaming={businessResponse.isStreaming}
              userPlan={userPlan}
              onPublishToLinkedIn={onPublishToLinkedIn}
              onSchedule={onSchedule}
              showVariantBadge={true}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Swipeable carousel */}
      <div className="md:hidden relative">
        {/* Card with swipe */}
        <motion.div
          className="relative overflow-hidden touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ cursor: "grab" }}
          whileDrag={{ cursor: "grabbing" }}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              <ModernResponseCard
                content={activeResponse.content}
                variant={activeResponse.variant}
                timestamp={activeResponse.timestamp}
                isStreaming={activeResponse.isStreaming}
                userPlan={userPlan}
                onPublishToLinkedIn={onPublishToLinkedIn}
                onSchedule={onSchedule}
                showVariantBadge={true}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Mobile navigation - AUTOSCROLL colors enhanced */}
        <div className="flex items-center justify-center mt-4 gap-3">
          {/* Prev button with gradient */}
          <motion.button
            onClick={() => handleNavigate("prev")}
            disabled={activeIndex === 0}
            whileHover={activeIndex !== 0 ? { scale: 1.05 } : {}}
            whileTap={activeIndex !== 0 ? { scale: 0.95 } : {}}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200
              ${activeIndex === 0
                ? "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-dark-elevated"
                : "bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20"
              }
            `}
            aria-label="Version précédente"
          >
            <svg className={`w-4 h-4 ${activeIndex === 0 ? "text-text-muted" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* Dots indicator with enhanced colors */}
          <div className="flex items-center gap-1.5">
            {responses.map((r, idx) => (
              <motion.button
                key={idx}
                onClick={() => {
                  setDirection(idx > activeIndex ? 1 : -1);
                  setActiveIndex(idx);
                  triggerHaptic("light");
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`
                  transition-all duration-300
                  ${idx === activeIndex
                    ? `w-6 h-1.5 rounded-full ${r.variant === "storytelling" ? "bg-primary-hover shadow-[0_0_8px_rgba(247,107,84,0.5)]" : "bg-primary shadow-glow"}`
                    : "w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"
                  }
                `}
                aria-label={`Voir version ${variantLabels[r.variant]}`}
              />
            ))}
          </div>

          {/* Label with gradient text */}
          <div className={`text-xs font-medium ${activeResponse.variant === "storytelling" ? "text-primary-hover" : "text-primary"}`}>
            {variantIcons[activeResponse.variant]} {variantLabels[activeResponse.variant]}
          </div>

          {/* Next button with gradient */}
          <motion.button
            onClick={() => handleNavigate("next")}
            disabled={activeIndex === responses.length - 1}
            whileHover={activeIndex !== responses.length - 1 ? { scale: 1.05 } : {}}
            whileTap={activeIndex !== responses.length - 1 ? { scale: 0.95 } : {}}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200
              ${activeIndex === responses.length - 1
                ? "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-dark-elevated"
                : "bg-gradient-to-br from-primary/10 to-primary-hover/10 hover:from-primary/20 hover:to-primary-hover/20 border border-primary/20"
              }
            `}
            aria-label="Version suivante"
          >
            <svg className={`w-4 h-4 ${activeIndex === responses.length - 1 ? "text-text-muted" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
});

export default ModernAIResponsePair;
