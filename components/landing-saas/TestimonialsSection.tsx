"use client";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "Cette plateforme a complètement transformé le fonctionnement de notre équipe. Nous avons réduit les tâches manuelles de 70 % et pouvons désormais nous concentrer sur l'essentiel : développer notre activité.",
    author: "Sophie Martin",
    role: "Directrice des opérations",
    company: "TechFlow France",
    avatar: "SM",
  },
  {
    quote: "Le tableau de bord analytique seul vaut l'investissement. Nous avons enfin une visibilité en temps réel sur nos indicateurs clés, et les rapports automatisés nous font gagner des heures chaque semaine.",
    author: "Marc Dubois",
    role: "PDG & Fondateur",
    company: "ScaleUp Ventures",
    avatar: "MD",
  },
  {
    quote: "L'implémentation a été fluide et l'équipe support est exceptionnelle. En deux semaines, toute notre organisation était opérationnelle et fonctionnait à pleine capacité.",
    author: "Émilie Laurent",
    role: "Directrice technique",
    company: "Innovate Labs",
    avatar: "EL",
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24"
    >
      <div className="max-w-6xl mx-auto w-full">
        {/* En-tête de section */}
        <div className="text-center mb-16">
          <span className="text-overline text-accent mb-4 block">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            La confiance des{" "}
            <span className="text-gradient bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              leaders du secteur
            </span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Rejoignez des milliers d&apos;entreprises qui ont déjà transformé leurs opérations avec notre plateforme. Voici ce qu&apos;ils en disent.
          </p>
        </div>

        {/* Grille des témoignages */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 flex flex-col"
            >
              {/* Icône citation */}
              <div className="text-primary/30 mb-4">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Citation */}
              <p className="text-text-secondary leading-relaxed flex-1 mb-6">
                &laquo; {testimonial.quote} &raquo;
              </p>

              {/* Auteur */}
              <div className="flex items-center gap-4 pt-4 border-t border-dark-border">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.avatar}
                </div>

                {/* Informations */}
                <div>
                  <p className="text-white font-medium">{testimonial.author}</p>
                  <p className="text-text-muted text-sm">
                    {testimonial.role} chez {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Indicateurs de confiance */}
        <div className="mt-16 text-center">
          <p className="text-text-muted mb-8">
            Plus de 2 500 entreprises nous font confiance à travers le monde
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-50">
            {/* Logos placeholder */}
            {["Entreprise A", "Entreprise B", "Entreprise C", "Entreprise D", "Entreprise E"].map(
              (company, index) => (
                <div
                  key={index}
                  className="text-text-muted font-semibold text-lg tracking-wide"
                >
                  {company}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
