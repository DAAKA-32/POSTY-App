"use client";

import Link from "next/link";
import Image from "next/image";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        Oups, quelque chose a coince
      </h1>
      <p className="text-text-secondary text-center max-w-md mb-2">
        Pas de panique, vos donnees sont en securite.
      </p>
      <p className="text-text-muted text-sm text-center max-w-md mb-8">
        Essayez de rafraichir la page. Si le probleme persiste, notre equipe est la pour vous aider.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors shadow-btn-primary text-sm"
        >
          Rafraichir la page
        </button>
        <Link
          href="/app"
          className="flex-1 px-6 py-3 bg-card hover:bg-dark-elevated text-text-primary font-medium rounded-xl border border-border transition-colors text-sm text-center"
        >
          Retour a l&apos;accueil
        </Link>
      </div>

      <p className="mt-6 text-text-subtle text-xs">
        Besoin d&apos;aide ?{" "}
        <a
          href="mailto:support@posty.fr"
          className="text-primary hover:text-primary-hover underline underline-offset-2"
        >
          Contactez le support
        </a>
      </p>
    </div>
  );
}
