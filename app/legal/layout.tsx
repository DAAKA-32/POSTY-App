"use client";

import { ReactNode, useEffect } from "react";

/**
 * Layout independant pour les pages legales
 * Force le mode clair (light) independamment du theme utilisateur
 * Permet le scroll vertical et n'inclut pas le layout principal de l'app
 */
export default function LegalLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Force light mode on legal pages, restore previous theme on unmount
  useEffect(() => {
    const root = document.documentElement;

    // Save current theme state
    const wasDark = root.classList.contains("dark");
    const wasLight = root.classList.contains("light");
    const previousColorScheme = root.style.colorScheme;
    const previousDataTheme = root.getAttribute("data-theme");

    // Force light mode
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.setAttribute("data-theme", "light");

    return () => {
      // Restore previous theme state
      root.classList.remove("light", "dark");
      if (wasDark) {
        root.classList.add("dark");
      } else if (wasLight) {
        root.classList.add("light");
      }
      root.style.colorScheme = previousColorScheme || "";
      if (previousDataTheme) {
        root.setAttribute("data-theme", previousDataTheme);
      } else {
        root.removeAttribute("data-theme");
      }
    };
  }, []);

  return (
    <div className="legal-page-container">
      <style jsx global>{`
        /* Override global overflow:hidden for legal pages */
        html.legal-page,
        html.legal-page body {
          overflow: visible !important;
          overflow-y: auto !important;
          height: auto !important;
          min-height: 100vh !important;
        }

        /* Legal page specific styles - force light */
        .legal-page-container {
          min-height: 100vh;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
          color-scheme: light;
        }
      `}</style>
      {children}
    </div>
  );
}
