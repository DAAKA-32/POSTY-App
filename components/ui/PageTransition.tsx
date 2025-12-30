"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// ============== PAGE TRANSITION WRAPPER ==============

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsVisible(false);
    const timeout = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      className={`
        transition-all duration-400 ease-out
        ${isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============== PAGE WRAPPER (with loading state) ==============

interface PageWrapperProps {
  children: ReactNode;
  loading?: boolean;
  loadingComponent?: ReactNode;
  className?: string;
}

export function PageWrapper({
  children,
  loading = false,
  loadingComponent,
  className = "",
}: PageWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return loadingComponent || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent animate-pulse-soft" />
          <p className="text-text-secondary text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
}

// ============== SECTION TRANSITION ==============

interface SectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Section({ children, delay = 0, className = "" }: SectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============== MODAL TRANSITION ==============

interface ModalTransitionProps {
  children: ReactNode;
  show: boolean;
  onClose?: () => void;
  className?: string;
}

export function ModalTransition({
  children,
  show,
  onClose,
  className = "",
}: ModalTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    }
  }, [show]);

  const handleTransitionEnd = () => {
    if (!show) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${show ? "opacity-100" : "opacity-0"}
        `}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center p-4
          transition-all duration-300
          ${show
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
          }
          ${className}
        `}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </>
  );
}

// ============== DRAWER TRANSITION ==============

interface DrawerTransitionProps {
  children: ReactNode;
  show: boolean;
  side?: "left" | "right" | "bottom";
  onClose?: () => void;
  className?: string;
}

export function DrawerTransition({
  children,
  show,
  side = "right",
  onClose,
  className = "",
}: DrawerTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  const handleTransitionEnd = () => {
    if (!show) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  const sideStyles = {
    left: {
      container: "left-0 top-0 bottom-0",
      hidden: "-translate-x-full",
      visible: "translate-x-0",
    },
    right: {
      container: "right-0 top-0 bottom-0",
      hidden: "translate-x-full",
      visible: "translate-x-0",
    },
    bottom: {
      container: "left-0 right-0 bottom-0",
      hidden: "translate-y-full",
      visible: "translate-y-0",
    },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${show ? "opacity-100" : "opacity-0"}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed z-50 bg-dark-card
          transition-transform duration-300 ease-out
          ${sideStyles[side].container}
          ${show ? sideStyles[side].visible : sideStyles[side].hidden}
          ${className}
        `}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </>
  );
}

// ============== TOAST ANIMATION ==============

interface ToastAnimationProps {
  children: ReactNode;
  show: boolean;
  position?: "top" | "bottom";
  className?: string;
}

export function ToastAnimation({
  children,
  show,
  position = "top",
  className = "",
}: ToastAnimationProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    }
  }, [show]);

  const handleTransitionEnd = () => {
    if (!show) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  const positionStyles = {
    top: {
      container: "top-4",
      hidden: "-translate-y-full opacity-0",
      visible: "translate-y-0 opacity-100",
    },
    bottom: {
      container: "bottom-4",
      hidden: "translate-y-full opacity-0",
      visible: "translate-y-0 opacity-100",
    },
  };

  return (
    <div
      className={`
        fixed left-1/2 -translate-x-1/2 z-50
        transition-all duration-300 ease-out
        ${positionStyles[position].container}
        ${show ? positionStyles[position].visible : positionStyles[position].hidden}
        ${className}
      `}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
}

// ============== COLLAPSE ANIMATION ==============

interface CollapseProps {
  children: ReactNode;
  show: boolean;
  className?: string;
}

export function Collapse({ children, show, className = "" }: CollapseProps) {
  return (
    <div
      className={`
        overflow-hidden transition-all duration-300 ease-out
        grid
        ${show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
        ${className}
      `}
    >
      <div className="min-h-0">
        <div className={`transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============== LIST ITEM ANIMATION ==============

interface ListAnimationProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export function ListAnimation({
  children,
  staggerDelay = 50,
  className = "",
}: ListAnimationProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: `${index * staggerDelay}ms`, animationFillMode: "forwards" }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
