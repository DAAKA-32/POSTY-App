"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
}

const legalLinks = [
  { name: "Confidentialite", href: "/legal/privacy" },
  { name: "Conditions", href: "/legal/terms" },
  { name: "Mentions", href: "/legal/notices" },
];

export default function LegalLayout({ children, title }: LegalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-card/95 backdrop-blur-xl border-b border-dark-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="POSTY Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-lg hidden">P</span>
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">POSTY</span>
          </Link>
          <Link
            href="/app"
            className="
              flex items-center gap-2 px-4 py-2
              text-sm text-text-secondary hover:text-white
              bg-dark-elevated hover:bg-dark-hover
              border border-dark-border hover:border-primary/30
              rounded-xl transition-all duration-200
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </Link>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="border-b border-dark-border bg-dark-card/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                  ${pathname === link.href
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-white hover:bg-dark-hover"
                  }
                `}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{title}</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full" />
        </div>
        <div className="prose prose-invert prose-sm lg:prose-base max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-text-secondary prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:text-accent
          prose-strong:text-white prose-strong:font-semibold
          prose-ul:text-text-secondary prose-li:text-text-secondary
          prose-hr:border-dark-border
        ">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-card mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="POSTY Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <span className="text-white font-bold text-sm hidden">P</span>
              </div>
              <span className="text-sm text-text-secondary">
                © {new Date().getFullYear()} POSTY. Tous droits reserves.
              </span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/legal/privacy" className="text-text-secondary hover:text-primary transition-colors">
                Confidentialite
              </Link>
              <Link href="/legal/terms" className="text-text-secondary hover:text-primary transition-colors">
                CGU
              </Link>
              <Link href="/legal/notices" className="text-text-secondary hover:text-primary transition-colors">
                Mentions legales
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-dark-border text-center">
            <p className="text-xs text-text-muted">
              Contact RGPD : privacy@posty.app | Pour exercer vos droits : contact@posty.app
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
