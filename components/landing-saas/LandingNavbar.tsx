"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useScrollLock } from "@/hooks/useScrollLock";

interface NavLink {
  label: string;
  href: string;
  color: "violet" | "blue" | "amber" | "orange";
  icon: React.ReactNode;
}

const navLinks: NavLink[] = [
  {
    label: "Démo",
    href: "#demo",
    color: "violet",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Fonctionnalités",
    href: "#features",
    color: "blue",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: "Témoignages",
    href: "#testimonials",
    color: "amber",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: "Tarifs",
    href: "#pricing",
    color: "orange",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Centralized scroll lock when mobile menu is open
  useScrollLock(mobileMenuOpen);

  const handleScrollTo = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      const targetId = href.replace("#", "");
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      setMobileMenuOpen(false);
    },
    []
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-dark-border pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-glow">
                <img
                  src="/logo.jpg"
                  alt="Posty Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-semibold text-white text-xl tracking-tight">
                Posty
              </span>
            </Link>

            {/* Navigation Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="text-text-secondary hover:text-white transition-colors duration-200 text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Boutons CTA Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-text-secondary hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Se connecter
              </Link>
              <Link
                href="/login?mode=signup"
                className="btn-primary inline-flex items-center"
              >
                Essai gratuit
              </Link>
            </div>

            {/* Bouton Menu Mobile - Sans fond blanc */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white hover:text-primary transition-colors relative z-[60]"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6L18 18M6 18L18 6"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Mobile avec Backdrop flou - Rendu en plein écran */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop flou statique (non scrollable) */}
          <div
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-md md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              animation: "fadeIn 0.2s ease-out",
            }}
            aria-hidden="true"
          />

          {/* Menu slide depuis la droite */}
          <div
            className="fixed top-0 right-0 bottom-0 z-[60] w-[280px] bg-background/98 backdrop-blur-xl border-l border-dark-border md:hidden shadow-2xl"
            style={{
              animation: "slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Header du menu avec bouton fermer */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-dark-border">
              <span className="font-semibold text-white text-lg">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-dark-hover transition-colors"
                aria-label="Fermer le menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6L18 18M6 18L18 6"
                  />
                </svg>
              </button>
            </div>

            {/* Contenu du menu */}
            <div className="px-4 py-6 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 64px)" }}>
              {/* Navigation links with vibrant colors */}
              {navLinks.map((link, index) => {
                const colorClasses = {
                  violet: "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30",
                  blue: "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30",
                  amber: "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30",
                  orange: "text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30",
                };
                const iconColorClasses = {
                  violet: "text-violet-500",
                  blue: "text-blue-500",
                  amber: "text-amber-500",
                  orange: "text-orange-500",
                };
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleScrollTo(e, link.href)}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-xl
                      border transition-all duration-200
                      ${colorClasses[link.color]}
                    `}
                    style={{
                      animation: `fadeInUp 0.3s ease-out ${index * 0.08}s backwards`,
                    }}
                  >
                    <span className={`flex-shrink-0 ${iconColorClasses[link.color]}`}>
                      {link.icon}
                    </span>
                    <span className="font-semibold text-white">{link.label}</span>
                  </a>
                );
              })}

              {/* Séparateur */}
              <div className="py-4">
                <div className="border-t border-dark-border" />
              </div>

              {/* Boutons CTA */}
              <div className="space-y-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-text-secondary hover:text-white hover:bg-dark-hover transition-all duration-200 text-base font-medium text-center"
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${navLinks.length * 0.05 + 0.05}s backwards`,
                  }}
                >
                  Se connecter
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center"
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${navLinks.length * 0.05 + 0.1}s backwards`,
                  }}
                >
                  Essai gratuit
                </Link>
              </div>
            </div>
          </div>

          {/* Animations CSS inline */}
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes slideInRight {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }

            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </>
  );
}
