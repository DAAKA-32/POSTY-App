"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Slide transition (iOS-like)
const slideVariants: Variants = {
  initial: {
    x: "100%",
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    x: "-30%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Fade transition (subtle)
const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Scale fade transition (material-like)
const scaleFadeVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Slide up transition (bottom sheet style)
const slideUpVariants: Variants = {
  initial: {
    y: "100%",
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 35,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

export type TransitionType = "slide" | "fade" | "scale" | "slideUp";

const variantsMap: Record<TransitionType, Variants> = {
  slide: slideVariants,
  fade: fadeVariants,
  scale: scaleFadeVariants,
  slideUp: slideUpVariants,
};

// Main page transition wrapper
export default function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={scaleFadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`w-full ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Customizable transition wrapper
export function TransitionWrapper({
  children,
  type = "scale",
  className = "",
}: PageTransitionProps & { type?: TransitionType }) {
  return (
    <motion.div
      variants={variantsMap[type]}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const staggerContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function StaggerContainer({
  children,
  className = "",
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  );
}

// Individual staggered item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}

// Animated presence wrapper for conditional rendering
interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  show: boolean;
  type?: TransitionType;
  className?: string;
}

export function AnimatedPresenceWrapper({
  children,
  show,
  type = "scale",
  className = "",
}: AnimatedPresenceWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          variants={variantsMap[type]}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Scroll reveal animation
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  threshold = 0.1,
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// Tap animation wrapper (for buttons/cards)
interface TapAnimationProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function TapAnimation({
  children,
  className = "",
  scale = 0.97,
}: TapAnimationProps) {
  return (
    <motion.div
      className={className}
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

// Hover scale animation
interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function HoverScale({
  children,
  className = "",
  scale = 1.02,
}: HoverScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
