"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LegalLayoutLightProps {
  children: ReactNode;
  title: string;
}

const legalLinks = [
  { name: "Politique de confidentialite", href: "/legal/privacy" },
  { name: "Conditions d'utilisation", href: "/legal/terms" },
  { name: "Mentions legales", href: "/legal/notices" },
  { name: "Cookies", href: "/legal/cookies" },
];

/**
 * LegalLayoutLight - Layout pour les pages legales
 * Mode sombre pour coherence avec l'application POSTY
 */
export default function LegalLayoutLight({ children, title }: LegalLayoutLightProps) {
  const pathname = usePathname();

  // Enable full scrolling on Legal pages (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("legal-scroll-enabled");
    document.body.classList.add("legal-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("legal-scroll-enabled");
      document.body.classList.remove("legal-scroll-enabled");
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-white"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "100vh",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-card border-b border-dark-border backdrop-blur-sm">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src="/logo.jpg"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">POSTY</span>
          </Link>

          {/* Return button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary bg-dark-elevated hover:bg-dark-hover rounded-lg no-underline transition-colors duration-200"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour a l&apos;application
          </Link>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-[960px] mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 text-sm whitespace-nowrap rounded-lg no-underline transition-all duration-200
                  ${pathname === link.href
                    ? "font-semibold text-primary bg-primary/10"
                    : "font-normal text-text-secondary hover:text-white hover:bg-dark-hover"
                  }
                `}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-[960px] mx-auto px-6 py-10 pb-20">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            {title}
          </h1>
          <div className="w-[60px] h-[3px] bg-primary rounded-full" />
        </div>

        {/* Content */}
        <div className="text-[15px] leading-relaxed text-text-secondary">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-card mt-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8">
          <div className="flex flex-col items-center gap-4">
            {/* Logo and copyright */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Posty Logo"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-sm text-text-muted">
                © {new Date().getFullYear()} POSTY. Tous droits reserves.
              </span>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
              <Link
                href="/legal/privacy"
                className="text-text-muted hover:text-white no-underline transition-colors duration-200"
              >
                Confidentialite
              </Link>
              <Link
                href="/legal/terms"
                className="text-text-muted hover:text-white no-underline transition-colors duration-200"
              >
                CGU
              </Link>
              <Link
                href="/legal/notices"
                className="text-text-muted hover:text-white no-underline transition-colors duration-200"
              >
                Mentions legales
              </Link>
              <Link
                href="/legal/cookies"
                className="text-text-muted hover:text-white no-underline transition-colors duration-200"
              >
                Cookies
              </Link>
            </div>

            {/* Contact + CNIL */}
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-xs text-text-subtle">
                Contact RGPD : privacy@posty.app
              </p>
              <p className="text-xs text-text-subtle">
                Autorite de controle :{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-accent no-underline transition-colors duration-200"
                >
                  CNIL (www.cnil.fr)
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
