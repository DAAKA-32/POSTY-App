"use client";

import { useCallback, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SkipLink {
  id: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

/**
 * Skip links for keyboard navigation
 * Allows users to skip to main content areas quickly
 *
 * Renders only after mount to avoid hydration mismatch —
 * language is resolved client-side (localStorage / browser locale).
 */
export default function SkipLinks({ links }: SkipLinksProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultLinks: SkipLink[] = [
    { id: "main-content", label: t.accessibility.skipToContent },
    { id: "navigation", label: t.accessibility.skipToNavigation },
    { id: "chat-input", label: t.accessibility.skipToInput },
  ];

  const resolvedLinks = links ?? defaultLinks;

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Defer render to avoid hydration mismatch from client-side language detection
  if (!mounted) return null;

  return (
    <nav
      aria-label={t.accessibility.quickAccessLinks}
      className="skip-links-container"
    >
      {resolvedLinks.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={(e) => handleClick(e, link.id)}
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-[100]
            focus:px-4 focus:py-2
            focus:bg-primary focus:text-white
            focus:rounded-lg focus:shadow-lg
            focus:outline-none focus:ring-2 focus:ring-white
            focus:font-medium focus:text-sm
            transition-all duration-200
          "
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Visually hidden component for screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

/**
 * Live region for announcing dynamic content changes
 */
export function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
}: {
  children: React.ReactNode;
  politeness?: "polite" | "assertive" | "off";
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, politeness: "polite" | "assertive" = "polite") => {
    // Create a temporary element to announce the message
    const announcer = document.createElement("div");
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", politeness);
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "sr-only";
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement is made
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return announce;
}
