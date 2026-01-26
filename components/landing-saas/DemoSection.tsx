"use client";

import Link from "next/link";

export default function DemoSection() {
  return (
    <section
      id="demo"
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-sm text-primary font-medium">
            Démo interactive disponible
          </span>
        </div>

        {/* Titre principal */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Optimisez votre flux de travail avec{" "}
          <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            l&apos;automatisation intelligente
          </span>
        </h1>

        {/* Sous-titre */}
        <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
          Découvrez comment notre plateforme peut transformer vos opérations quotidiennes. Visualisez notre démo interactive et constatez la puissance d&apos;une intégration fluide.
        </p>

        {/* Carte de prévisualisation */}
        <div className="relative w-full max-w-3xl mx-auto mt-12">
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-elevated">
            {/* En-tête navigateur */}
            <div className="flex items-center gap-2 px-4 py-3 bg-dark-elevated border-b border-dark-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-error/70" />
                <div className="w-3 h-3 rounded-full bg-warning/70" />
                <div className="w-3 h-3 rounded-full bg-success/70" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-dark-bg rounded-md px-3 py-1.5 text-xs text-text-muted text-center">
                  app.postie.fr/tableau-de-bord
                </div>
              </div>
            </div>

            {/* Zone de contenu démo */}
            <div className="p-8 md:p-12">
              <div className="space-y-6">
                {/* Éléments simulés du tableau de bord */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-dark-hover rounded animate-pulse" />
                  <div className="h-8 w-24 bg-primary/20 rounded-lg" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-dark-elevated border border-dark-border rounded-xl p-4"
                    >
                      <div className="h-3 w-16 bg-dark-hover rounded mb-3" />
                      <div className="h-8 w-20 bg-primary/30 rounded" />
                    </div>
                  ))}
                </div>

                <div className="bg-dark-elevated border border-dark-border rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-4 w-24 bg-dark-hover rounded" />
                    <div className="flex-1 h-2 bg-dark-hover rounded-full">
                      <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-dark-hover/50 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Éléments décoratifs */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
        </div>

        {/* Boutons CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <Link
            href="/login"
            className="btn-primary px-8 py-3 text-base"
          >
            Démarrer l&apos;essai gratuit
          </Link>
          <Link
            href="/login"
            className="btn-secondary px-8 py-3 text-base flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Voir la démo complète
          </Link>
        </div>
      </div>
    </section>
  );
}
