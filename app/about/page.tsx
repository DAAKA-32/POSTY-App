"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Linkedin, Target, Sparkles } from "lucide-react";
import { AboutPageJsonLd } from "@/components/seo/JsonLd";

// =============================================================================
// TEAM DATA - Informations réelles uniquement
// =============================================================================
const teamMembers = [
  {
    name: "Emilien Nepveu",
    role: "CTO, CEO & Fondateur",
    photo: "/founder.jpg",
    linkedIn: "https://www.linkedin.com/in/e-nepveu-58a38127a/",
    bio: "Responsable de toute la partie technique de Posty. J'ai conçu et développé l'ensemble de l'application : interface utilisateur (UI), expérience utilisateur (UX), et intégration des appels API avec l'intelligence artificielle.",
    expertise: ["Développement Full-Stack", "UX/UI Design", "Intelligence Artificielle", "Architecture SaaS"],
  },
  {
    name: "Côme Maubert",
    role: "CFO & Co-Fondateur",
    photo: "/cmo.jpg",
    linkedIn: null,
    bio: "En charge du financement et de la stratégie publicitaire de Posty. Je pilote les campagnes d'acquisition et le développement commercial pour accélérer la croissance de l'entreprise.",
    expertise: ["Financement", "Publicité & Acquisition", "Stratégie Commerciale"],
  },
  {
    name: "Jean Bouchand",
    role: "Designer Marketing",
    photo: "/mark.jpg",
    linkedIn: null,
    bio: "Responsable de l'identité visuelle et de la stratégie de marque de Posty. Je conçois les supports marketing et m'assure que chaque point de contact reflète notre vision d'un SaaS premium et accessible.",
    expertise: ["Design Graphique", "Branding", "Marketing Visuel", "UI/UX Design"],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function AboutPage() {
  // Enable full scrolling on About page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("about-scroll-enabled");
    document.body.classList.add("about-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("about-scroll-enabled");
      document.body.classList.remove("about-scroll-enabled");
    };
  }, []);

  return (
    <>
      {/* Structured Data for SEO */}
      <AboutPageJsonLd />

      <div
        className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-orange-50/30"
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: "100vh",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Retour</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Posty" width={32} height={32} className="rounded-lg overflow-hidden" />
              <span className="font-bold text-lg text-gray-900">Posty</span>
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              À propos de Posty
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              L'outil SaaS qui automatise votre présence LinkedIn grâce à l'IA
            </p>
          </motion.section>

          {/* Mission Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-16"
          >
            <div className="bg-gradient-to-br from-warm-orange/10 to-warm-coral/10 rounded-2xl p-8 border border-warm-orange/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warm-orange to-warm-coral flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Notre mission
                </h2>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">
                Posty aide les entrepreneurs et professionnels à créer du contenu LinkedIn de qualité,
                rapidement et sans effort. Notre IA génère des posts authentiques qui reflètent votre
                expertise, pour que vous puissiez vous concentrer sur votre activité principale.
              </p>
            </div>
          </motion.section>

          {/* What Posty Does */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Ce que fait Posty
            </h2>
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-warm-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-warm-orange"></span>
                  </span>
                  <span>
                    <strong className="text-gray-900">Génération de posts LinkedIn</strong> —
                    Décrivez votre idée, l'IA crée deux versions : Storytelling et Business.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-warm-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-warm-orange"></span>
                  </span>
                  <span>
                    <strong className="text-gray-900">Publication directe</strong> —
                    Connectez votre compte LinkedIn et publiez en un clic.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-warm-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-warm-orange"></span>
                  </span>
                  <span>
                    <strong className="text-gray-900">Personnalisation</strong> —
                    L'IA s'adapte à votre secteur, votre ton et votre style de communication.
                  </span>
                </li>
              </ul>
            </div>
          </motion.section>

          {/* Team Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              L'équipe
            </h2>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Photo or Initials Avatar */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-4 rounded-full overflow-hidden ring-4 ring-warm-orange/20">
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 112px, 128px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-warm-orange to-warm-coral flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl font-bold text-white">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name & Role */}
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-warm-orange font-medium mb-4">
                      {member.role}
                    </p>

                    {/* Bio */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {member.bio}
                    </p>

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap justify-center gap-2 mb-5">
                      {member.expertise.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* LinkedIn Link */}
                    {member.linkedIn && (
                      <a
                        href={member.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg transition-colors text-sm font-medium"
                        aria-label={`Voir le profil LinkedIn de ${member.name}`}
                      >
                        <Linkedin className="w-4 h-4" />
                        Voir le profil LinkedIn
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* AI Transparency */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-16"
          >
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    À propos de l'IA
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    Posty utilise l'intelligence artificielle pour vous assister dans la création de contenu.
                    Les posts générés sont des suggestions que vous pouvez personnaliser.
                    L'IA est un outil d'aide, pas un remplacement de votre expertise.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Contact Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-center"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Une question ?
            </h2>
            <p className="text-gray-600 mb-4">
              Contactez-nous via LinkedIn ou par email à{" "}
              <a
                href="mailto:postygroup@gmail.com"
                className="text-warm-orange hover:underline"
              >
                postygroup@gmail.com
              </a>
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {teamMembers
                .filter((member) => member.linkedIn)
                .map((member) => (
                  <a
                    key={member.name}
                    href={member.linkedIn!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                    aria-label={`Contacter ${member.name} sur LinkedIn`}
                  >
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    {member.name.split(" ")[0]}
                  </a>
                ))}
            </div>
          </motion.section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-8 bg-white/50">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Posty" width={24} height={24} className="rounded-md overflow-hidden" />
              <span className="text-sm text-gray-600">
                © {new Date().getFullYear()} Posty. Tous droits réservés.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/legal/privacy"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Confidentialité
              </Link>
              <Link
                href="/legal/terms"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                CGU
              </Link>
              <Link
                href="/legal/notices"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Mentions légales
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
