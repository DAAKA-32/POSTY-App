"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
  className?: string;
  onComplete?: () => void;
}

/**
 * Typewriter Effect Component
 *
 * Creates a realistic typing animation with optional cursor
 * Supports multiple texts with loop functionality
 */
export default function Typewriter({
  texts,
  speed = 80,
  deleteSpeed = 40,
  pauseDuration = 2000,
  loop = true,
  cursor = true,
  cursorChar = "|",
  className = "",
  onComplete,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const currentText = texts[textIndex];

  const typeText = useCallback(() => {
    if (isWaiting) return;

    if (!isDeleting) {
      // Typing
      if (displayText.length < currentText.length) {
        setDisplayText(currentText.slice(0, displayText.length + 1));
      } else {
        // Finished typing, wait then start deleting
        setIsWaiting(true);
        setTimeout(() => {
          setIsWaiting(false);
          if (loop || textIndex < texts.length - 1) {
            setIsDeleting(true);
          } else {
            onComplete?.();
          }
        }, pauseDuration);
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1));
      } else {
        // Finished deleting, move to next text
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
      }
    }
  }, [displayText, currentText, isDeleting, isWaiting, loop, textIndex, texts.length, pauseDuration, onComplete]);

  useEffect(() => {
    const timeout = setTimeout(
      typeText,
      isDeleting ? deleteSpeed : speed
    );
    return () => clearTimeout(timeout);
  }, [typeText, isDeleting, deleteSpeed, speed]);

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block ml-0.5"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
}

/**
 * TypewriterOnce - Types text once without deletion
 */
interface TypewriterOnceProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterOnce({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  className = "",
  onComplete,
}: TypewriterOnceProps) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const delayTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(delayTimeout);
  }, [delay]);

  useEffect(() => {
    if (!started || completed) return;

    if (displayText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setCompleted(true);
      onComplete?.();
    }
  }, [displayText, text, speed, started, completed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {cursor && !completed && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block ml-0.5"
        >
          |
        </motion.span>
      )}
    </span>
  );
}

/**
 * GradientTypewriter - Typewriter with gradient text
 */
interface GradientTypewriterProps extends TypewriterProps {
  gradientFrom?: string;
  gradientTo?: string;
}

export function GradientTypewriter({
  gradientFrom = "from-primary",
  gradientTo = "to-accent",
  className = "",
  ...props
}: GradientTypewriterProps) {
  return (
    <span className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent ${className}`}>
      <Typewriter {...props} className="" />
    </span>
  );
}
