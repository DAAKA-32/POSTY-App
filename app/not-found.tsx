"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Custom 404 Page - SEO-friendly error page
 * Provides helpful navigation and maintains brand consistency
 */
export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto">
          <img
            src="/logo.png"
            alt="Posty Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Error code */}
      <h1 className="text-8xl font-bold text-primary mb-4">404</h1>

      {/* Error message */}
      <h2 className="text-2xl font-semibold text-white mb-3 text-center">
        {t.errors?.pageNotFound || "Page introuvable"}
      </h2>
      <p className="text-text-secondary text-center max-w-md mb-8">
        {t.errors?.pageNotFoundDescription ||
          "La page que vous recherchez n'existe pas ou a ete deplacee."}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors duration-200"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {t.errors?.backToHome || "Retour a l'accueil"}
        </Link>

        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-dark-elevated hover:bg-dark-hover text-white font-medium rounded-xl border border-dark-border transition-colors duration-200"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t.errors?.viewPricing || "Voir les tarifs"}
        </Link>
      </div>

      {/* Helpful links */}
      <div className="mt-12 text-center">
        <p className="text-text-muted text-sm mb-4">
          {t.errors?.helpfulLinks || "Liens utiles"}
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href="/login"
            className="text-text-secondary hover:text-primary transition-colors"
          >
            {t.common?.login || "Connexion"}
          </Link>
          <span className="text-dark-border">|</span>
          <Link
            href="/signup"
            className="text-text-secondary hover:text-primary transition-colors"
          >
            {t.common?.signUp || "Inscription"}
          </Link>
          <span className="text-dark-border">|</span>
          <Link
            href="/legal/privacy"
            className="text-text-secondary hover:text-primary transition-colors"
          >
            {t.common?.privacy || "Confidentialite"}
          </Link>
          <span className="text-dark-border">|</span>
          <Link
            href="/legal/terms"
            className="text-text-secondary hover:text-primary transition-colors"
          >
            {t.common?.terms || "CGU"}
          </Link>
        </div>
      </div>

      {/* SEO: Schema.org BreadcrumbList for error page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Accueil",
                item: "https://posty-app.vercel.app/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Page introuvable",
              },
            ],
          }),
        }}
      />
    </div>
  );
}
