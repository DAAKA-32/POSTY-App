"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-primary mb-4">Erreur</h1>
      <p className="text-text-secondary text-center max-w-md mb-6">
        Une erreur inattendue s&apos;est produite. Veuillez réessayer.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-dark-elevated hover:bg-dark-hover text-white font-medium rounded-xl border border-dark-border transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
