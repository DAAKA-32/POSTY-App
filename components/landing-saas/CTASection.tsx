"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section
      id="cta"
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24 bg-dark-card/30 relative overflow-hidden"
    >
      {/* Décorations d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto w-full text-center relative z-10">
        {/* Carte CTA principale */}
        <div className="bg-dark-card border border-dark-border rounded-3xl p-8 md:p-12 lg:p-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-8">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-accent font-medium">
              Offre limitée dans le temps
            </span>
          </div>

          {/* Titre */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="text-silver-shimmer">Prêt à transformer</span>{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              votre entreprise ?
            </span>
          </h2>

          {/* Sous-titre */}
          <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
            Démarrez votre essai gratuit de 7 jours dès aujourd&apos;hui. Découvrez toute la puissance de notre plateforme et obtenez des résultats dès le premier jour.
          </p>

          {/* Liste des avantages */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-text-secondary">
            {[
              "Essai gratuit de 7 jours",
              "Garantie satisfait ou remboursé 7 jours",
              "Annulation à tout moment",
              "Support réactif par email",
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Boutons CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="btn-primary px-10 py-4 text-lg font-semibold w-full sm:w-auto text-center"
            >
              Démarrer l&apos;essai gratuit
            </Link>
            <Link
              href="/login?mode=signup"
              className="btn-ghost px-10 py-4 text-lg w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contacter l&apos;équipe commerciale
            </Link>
          </div>

          {/* Texte de confiance */}
          <p className="text-text-muted text-sm mt-8">
            Rejoignez les professionnels qui utilisent déjà Posty pour développer leur activité
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-dark-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Posty Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
                <span className="text-white font-bold text-sm hidden items-center justify-center">
                  P
                </span>
              </div>
              <span className="font-semibold text-white text-lg tracking-tight">
                Posty
              </span>
            </Link>

            {/* Liens */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted">
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Politique de confidentialité
              </Link>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Conditions d&apos;utilisation
              </Link>
              <Link href="/legal/notices" className="hover:text-white transition-colors">
                Mentions légales
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-text-muted">
              &copy; {new Date().getFullYear()} Posty. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
