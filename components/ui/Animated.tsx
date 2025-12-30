"use client";

import { ReactNode, useEffect, useState, useRef } from "react";

// ============== FADE IN COMPONENT ==============

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  once?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 400,
  direction = "up",
  className = "",
  once = true,
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [delay, once]);

  const directionStyles = {
    up: "translate-y-6",
    down: "-translate-y-6",
    left: "translate-x-6",
    right: "-translate-x-6",
    none: "",
  };

  return (
    <div
      ref={ref}
      className={`
        transition-all ease-out
        ${isVisible ? "opacity-100 translate-y-0 translate-x-0" : `opacity-0 ${directionStyles[direction]}`}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ============== STAGGER CONTAINER ==============

interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

export function Stagger({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  className = "",
}: StaggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), initialDelay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [initialDelay]);

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={`transition-all duration-400 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${index * staggerDelay}ms` }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

// ============== SCALE IN COMPONENT ==============

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className = "",
}: ScaleInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`
        transition-all ease-out
        ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// ============== SLIDE IN COMPONENT ==============

interface SlideInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
  className?: string;
}

export function SlideIn({
  children,
  delay = 0,
  duration = 400,
  direction = "left",
  className = "",
}: SlideInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [delay]);

  const directionStyles = {
    left: "-translate-x-full",
    right: "translate-x-full",
    up: "-translate-y-full",
    down: "translate-y-full",
  };

  return (
    <div
      ref={ref}
      className={`
        transition-all ease-out overflow-hidden
        ${isVisible ? "translate-x-0 translate-y-0" : directionStyles[direction]}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// ============== HOVER SCALE COMPONENT ==============

interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function HoverScale({
  children,
  scale = 1.02,
  className = "",
}: HoverScaleProps) {
  return (
    <div
      className={`transition-transform duration-200 ease-out hover:scale-[${scale}] ${className}`}
      style={{ "--hover-scale": scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ============== PRESS EFFECT COMPONENT ==============

interface PressEffectProps {
  children: ReactNode;
  className?: string;
}

export function PressEffect({ children, className = "" }: PressEffectProps) {
  return (
    <div
      className={`
        transition-transform duration-150 ease-out
        active:scale-[0.97]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============== COUNTER ANIMATION ==============

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  end,
  duration = 1500,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}

// ============== REVEAL ON SCROLL ==============

interface RevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function Reveal({ children, className = "", threshold = 0.1 }: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`
        transition-all duration-700 ease-out
        ${isVisible
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-8 blur-sm"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============== ANIMATE PRESENCE (simple version) ==============

interface AnimatePresenceProps {
  children: ReactNode;
  show: boolean;
  className?: string;
}

export function AnimatePresence({
  children,
  show,
  className = "",
}: AnimatePresenceProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const handleTransitionEnd = () => {
    if (!show) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`
        transition-all duration-300 ease-out
        ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        ${className}
      `}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
}

// ============== SHIMMER TEXT ==============

interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
}

export function ShimmerText({ children, className = "" }: ShimmerTextProps) {
  return (
    <span
      className={`
        bg-clip-text text-transparent
        bg-gradient-to-r from-white via-primary-light to-white
        bg-[length:200%_100%]
        animate-shimmer
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// ============== PULSE GLOW ==============

interface PulseGlowProps {
  children: ReactNode;
  color?: "primary" | "accent";
  className?: string;
}

export function PulseGlow({
  children,
  color = "primary",
  className = "",
}: PulseGlowProps) {
  const glowColors = {
    primary: "shadow-[0_0_20px_rgba(47,128,237,0.4)]",
    accent: "shadow-[0_0_20px_rgba(0,209,193,0.4)]",
  };

  return (
    <div className={`animate-glow-pulse ${glowColors[color]} ${className}`}>
      {children}
    </div>
  );
}

// ============== MAGNETIC HOVER (for buttons) ==============

interface MagneticProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({
  children,
  className = "",
  strength = 0.3,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "translate(0, 0)";
  };

  return (
    <div
      ref={ref}
      className={`transition-transform duration-200 ease-out ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

// ============== TYPEWRITER EFFECT ==============

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({
  text,
  speed = 50,
  delay = 0,
  className = "",
  onComplete,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
