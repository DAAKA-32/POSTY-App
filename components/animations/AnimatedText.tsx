"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";

// ============================================
// FADE IN TEXT
// ============================================

interface FadeInTextProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  className?: string;
  once?: boolean;
}

export function FadeInText({
  children,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 20,
  className = "",
  once = true,
}: FadeInTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-50px" });

  const getInitialPosition = () => {
    switch (direction) {
      case "up": return { y: distance };
      case "down": return { y: -distance };
      case "left": return { x: distance };
      case "right": return { x: -distance };
      default: return {};
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...getInitialPosition() }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// SLIDE IN TEXT
// ============================================

interface SlideInTextProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "left" | "right" | "top" | "bottom";
  className?: string;
  once?: boolean;
}

export function SlideInText({
  children,
  delay = 0,
  duration = 0.7,
  direction = "left",
  className = "",
  once = true,
}: SlideInTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-50px" });

  const getInitialPosition = () => {
    switch (direction) {
      case "left": return { x: -100, opacity: 0 };
      case "right": return { x: 100, opacity: 0 };
      case "top": return { y: -50, opacity: 0 };
      case "bottom": return { y: 50, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : getInitialPosition()}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// GLOW TEXT
// ============================================

interface GlowTextProps {
  children: ReactNode;
  color?: string;
  intensity?: "subtle" | "medium" | "strong";
  pulse?: boolean;
  className?: string;
}

export function GlowText({
  children,
  color = "primary",
  intensity = "medium",
  pulse = true,
  className = "",
}: GlowTextProps) {
  const glowIntensity = {
    subtle: { blur: "4px", spread: "2px" },
    medium: { blur: "8px", spread: "4px" },
    strong: { blur: "16px", spread: "8px" },
  };

  const colorMap: Record<string, string> = {
    primary: "rgba(232, 147, 77, 0.6)",
    accent: "rgba(248, 87, 81, 0.6)",
    white: "rgba(255, 255, 255, 0.4)",
    warning: "rgba(245, 158, 11, 0.6)",
  };

  const glowColor = colorMap[color] || color;
  const { blur } = glowIntensity[intensity];

  return (
    <motion.span
      animate={pulse ? {
        textShadow: [
          `0 0 ${blur} ${glowColor}`,
          `0 0 calc(${blur} * 1.5) ${glowColor}`,
          `0 0 ${blur} ${glowColor}`,
        ],
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={className}
      style={{ textShadow: `0 0 ${blur} ${glowColor}` }}
    >
      {children}
    </motion.span>
  );
}

// ============================================
// COLOR SHIFT TEXT
// ============================================

interface ColorShiftTextProps {
  children: ReactNode;
  colors?: string[];
  duration?: number;
  className?: string;
}

export function ColorShiftText({
  children,
  colors = ["#F8A35D", "#F85751", "#FAB9AD", "#F8A35D"],
  duration = 4,
  className = "",
}: ColorShiftTextProps) {
  return (
    <motion.span
      animate={{ color: colors }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

// ============================================
// GRADIENT ANIMATED TEXT
// ============================================

interface GradientAnimatedTextProps {
  children: ReactNode;
  className?: string;
}

export function GradientAnimatedText({
  children,
  className = "",
}: GradientAnimatedTextProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent ${className}`}
      animate={{ backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}

// ============================================
// STAGGERED TEXT (Letter by letter)
// ============================================

interface StaggeredTextProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  className?: string;
  letterClassName?: string;
}

export function StaggeredText({
  text,
  delay = 0,
  staggerDelay = 0.03,
  className = "",
  letterClassName = "",
}: StaggeredTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: staggerDelay,
      },
    },
  };

  const letter: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.span
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`inline-block ${className}`}
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          variants={letter}
          className={`inline-block ${letterClassName}`}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ============================================
// WORD BY WORD TEXT
// ============================================

interface WordByWordTextProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  className?: string;
  wordClassName?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export function WordByWordText({
  text,
  delay = 0,
  staggerDelay = 0.08,
  className = "",
  wordClassName = "",
  highlightWords = [],
  highlightClassName = "text-primary",
}: WordByWordTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: staggerDelay,
      },
    },
  };

  const word: Variants = {
    hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const words = text.split(" ");

  return (
    <motion.span
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`inline-block ${className}`}
    >
      {words.map((w, index) => (
        <motion.span
          key={index}
          variants={word}
          className={`inline-block mr-[0.25em] ${wordClassName} ${
            highlightWords.includes(w.toLowerCase()) ? highlightClassName : ""
          }`}
        >
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ============================================
// REVEAL TEXT (Mask animation)
// ============================================

interface RevealTextProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function RevealText({
  children,
  delay = 0,
  duration = 0.8,
  className = "",
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%" }}
        animate={isInView ? { y: 0 } : { y: "100%" }}
        transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// COUNTING NUMBER
// ============================================

interface CountingNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountingNumber({
  value,
  duration = 2,
  delay = 0,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: CountingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      >
        {isInView && (
          <Counter
            from={0}
            to={value}
            duration={duration}
            delay={delay}
            decimals={decimals}
          />
        )}
      </motion.span>
      {suffix}
    </span>
  );
}

function Counter({
  from,
  to,
  duration,
  delay,
  decimals,
}: {
  from: number;
  to: number;
  duration: number;
  delay: number;
  decimals: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        onUpdate={(latest) => {
          if (ref.current) {
            // Use requestAnimationFrame for smoother updates
          }
        }}
      >
        <CounterValue from={from} to={to} duration={duration} delay={delay} decimals={decimals} />
      </motion.span>
    </motion.span>
  );
}

function CounterValue({
  from,
  to,
  duration,
  delay,
  decimals,
}: {
  from: number;
  to: number;
  duration: number;
  delay: number;
  decimals: number;
}) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now() + delay * 1000;
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(updateCount);
        return;
      }

      if (now >= endTime) {
        setCount(to);
        return;
      }

      const progress = (now - startTime) / (duration * 1000);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setCount(from + (to - from) * eased);
      requestAnimationFrame(updateCount);
    };

    requestAnimationFrame(updateCount);
  }, [isInView, from, to, duration, delay]);

  return <span ref={ref}>{count.toFixed(decimals)}</span>;
}

import { useState, useEffect } from "react";
