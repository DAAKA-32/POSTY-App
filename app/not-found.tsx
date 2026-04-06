"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Custom 404 Page - SEO-friendly error page
 * Provides helpful navigation and maintains brand consistency
 */
export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-16 h-16 flex items-center justify-center rounded-2xl overflow-hidden mx-auto">
          <Image
            src="/logo.png"
            alt="Posty Logo"
            width={64}
            height={64}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Error code */}
      <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54] mb-4">404</h1>

      {/* Error message */}
      <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
        {t.errors?.pageNotFound || "Page introuvable"}
      </h2>
      <p className="text-gray-500 text-center max-w-md mb-8">
        {t.errors?.pageNotFoundDescription ||
          "La page que vous recherchez n'existe pas ou a été déplacée."}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F8935D] to-[#F76B54] hover:from-[#F76B54] hover:to-[#F8935D] text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-[#F8935D]/20"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t.errors?.backToHome || "Retour à l'accueil"}
        </Link>

        <Link
          href="/subscription"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors duration-200"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.errors?.viewPricing || "Voir les tarifs"}
        </Link>
      </div>

      {/* Popular pages — SEO internal links */}
      <div className="mt-14 w-full max-w-lg">
        <p className="text-gray-400 text-sm mb-4 text-center font-medium">
          {t.errors?.helpfulLinks || "Liens utiles"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ai-linkedin-post-generator" className="p-3 bg-white rounded-xl border border-gray-200 hover:border-[#F8935D]/40 transition-colors text-sm text-gray-700 hover:text-gray-900">
            AI Post Generator
          </Link>
          <Link href="/write-linkedin-post" className="p-3 bg-white rounded-xl border border-gray-200 hover:border-[#F8935D]/40 transition-colors text-sm text-gray-700 hover:text-gray-900">
            Write a LinkedIn Post
          </Link>
          <Link href="/linkedin-post-ideas" className="p-3 bg-white rounded-xl border border-gray-200 hover:border-[#F8935D]/40 transition-colors text-sm text-gray-700 hover:text-gray-900">
            Post Ideas
          </Link>
          <Link href="/linkedin-post-examples" className="p-3 bg-white rounded-xl border border-gray-200 hover:border-[#F8935D]/40 transition-colors text-sm text-gray-700 hover:text-gray-900">
            Post Examples
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm mt-6">
          <Link href="/login" className="text-gray-500 hover:text-[#F8935D] transition-colors">
            {t.common?.login || "Connexion"}
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/signup" className="text-gray-500 hover:text-[#F8935D] transition-colors">
            {t.common?.signUp || "Inscription"}
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/about" className="text-gray-500 hover:text-[#F8935D] transition-colors">
            {t.common?.about || "About"}
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/legal/privacy" className="text-gray-500 hover:text-[#F8935D] transition-colors">
            {t.common?.privacy || "Confidentialité"}
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/legal/terms" className="text-gray-500 hover:text-[#F8935D] transition-colors">
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
                item: "https://postyapp.ai/",
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
