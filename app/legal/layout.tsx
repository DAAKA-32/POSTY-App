"use client";

import { ReactNode } from "react";

/**
 * Layout independant pour les pages legales
 * Ce layout permet le scroll vertical et n'inclut pas le layout principal de l'app
 * Mode sombre pour coherence avec l'application POSTY
 */
export default function LegalLayout({
  children,
}: {
  children: ReactNode;
}) {
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

        /* Legal page specific styles */
        .legal-page-container {
          min-height: 100vh;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }

        /* Dark mode for legal pages */
        .legal-page-container {
          color-scheme: dark;
        }
      `}</style>
      {children}
    </div>
  );
}
