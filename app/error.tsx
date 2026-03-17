"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/15 rounded-full blur-2xl" />
        <div className="relative w-20 h-20 rounded-3xl overflow-hidden shadow-lg ring-2 ring-white/50 dark:ring-dark-card/50">
          <Image
            src="/logo.png"
            alt="Posty"
            width={80}
            height={80}
            className="w-full h-full object-contain opacity-60"
          />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
        {t.errors.errorPageTitle}
      </h1>
      <p className="text-text-secondary text-center max-w-md mb-2">
        {t.errors.errorPageDataSafe}
      </p>
      <p className="text-text-muted text-sm text-center max-w-md mb-8">
        {t.errors.errorPageTryRefresh}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors shadow-btn-primary text-sm"
        >
          {t.errors.errorPageRefresh}
        </button>
        <Link
          href="/app"
          className="flex-1 px-6 py-3 bg-card hover:bg-dark-elevated text-text-primary font-medium rounded-xl border border-border transition-colors text-sm text-center"
        >
          {t.errors.backToHome}
        </Link>
      </div>

      <p className="mt-6 text-text-subtle text-xs">
        {t.errors.errorPageNeedHelp}{" "}
        <a
          href="mailto:support@posty.fr"
          className="text-primary hover:text-primary-hover underline underline-offset-2"
        >
          {t.errors.errorPageContactSupport}
        </a>
      </p>
    </div>
  );
}
