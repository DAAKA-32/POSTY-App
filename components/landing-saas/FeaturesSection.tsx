"use client";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Performance ultra-rapide",
    description: "Profitez de temps de chargement instantanés grâce à notre infrastructure optimisée. Votre équipe n'attendra plus jamais ses données.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Sécurité de niveau bancaire",
    description: "Chiffrement de pointe et certifications de conformité pour protéger vos données sensibles en permanence.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Tableau de bord analytique",
    description: "Obtenez des insights actionnables grâce à nos analyses en temps réel. Prenez des décisions éclairées qui accélèrent la croissance de votre entreprise.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Collaboration fluide en équipe",
    description: "Travaillez ensemble sans effort grâce à nos outils de collaboration intégrés. Gardez toute votre équipe alignée et productive.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24 bg-dark-card/30"
    >
      <div className="max-w-6xl mx-auto w-full">
        {/* En-tête de section */}
        <div className="text-center mb-16">
          <span className="text-overline text-primary mb-4 block">
            Fonctionnalités puissantes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            <span className="text-silver-shimmer">Tout ce dont vous avez besoin pour</span>{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              développer votre activité
            </span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Notre suite complète d&apos;outils est conçue pour aider les équipes modernes à travailler plus intelligemment. De l&apos;automatisation à l&apos;analytique, nous avons tout prévu.
          </p>
        </div>

        {/* Grille des fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 transition-all duration-300 feature-card-desktop"
            >
              {/* Icône */}
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary mb-6 feature-icon transition-colors duration-300">
                {feature.icon}
              </div>

              {/* Contenu */}
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA bas de section */}
        <div className="text-center mt-12">
          <p className="text-text-muted mb-4">
            Et bien d&apos;autres fonctionnalités à découvrir...
          </p>
          <a
            href="#cta"
            className="text-primary font-medium inline-flex items-center gap-2 transition-colors"
          >
            Voir toutes les fonctionnalités
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
