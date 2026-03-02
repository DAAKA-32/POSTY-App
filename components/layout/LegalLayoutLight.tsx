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
 * Mode clair force pour coherence avec les pages publiques
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
      className="bg-[#FAFBFC] text-[#1A1D21]"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] backdrop-blur-sm">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 flex items-center justify-center rounded-2xl overflow-hidden">
              <img
                src="/logo.png"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-lg text-gray-900">POSTY</span>
          </Link>

          {/* Return button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary bg-[#F8FAFC] hover:bg-[#F3F4F6] rounded-lg no-underline transition-colors duration-200"
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
      <nav className="border-b border-[#E5E7EB] bg-[#FAFBFC]">
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
                    : "font-normal text-[#6B7280] hover:text-[#1A1D21] hover:bg-[#F3F4F6]"
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1D21] mb-2 leading-tight">
            {title}
          </h1>
          <div className="w-[60px] h-[3px] bg-primary rounded-full" />
        </div>

        {/* Content */}
        <div className="text-[15px] leading-relaxed text-[#4B5563]">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white mt-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8">
          <div className="flex flex-col items-center gap-4">
            {/* Logo and copyright */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 flex items-center justify-center rounded-xl overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Posty Logo"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-sm text-[#6B7280]">
                © {new Date().getFullYear()} POSTY. Tous droits reserves.
              </span>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
              <Link
                href="/legal/privacy"
                className="text-[#6B7280] hover:text-[#1A1D21] no-underline transition-colors duration-200"
              >
                Confidentialité
              </Link>
              <Link
                href="/legal/terms"
                className="text-[#6B7280] hover:text-[#1A1D21] no-underline transition-colors duration-200"
              >
                CGU
              </Link>
              <Link
                href="/legal/notices"
                className="text-[#6B7280] hover:text-[#1A1D21] no-underline transition-colors duration-200"
              >
                Mentions légales
              </Link>
              <Link
                href="/legal/cookies"
                className="text-[#6B7280] hover:text-[#1A1D21] no-underline transition-colors duration-200"
              >
                Cookies
              </Link>
            </div>

            {/* Contact + CNIL */}
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-xs text-[#9CA3AF]">
                Contact RGPD : postygroup@gmail.com
              </p>
              <p className="text-xs text-[#9CA3AF]">
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
