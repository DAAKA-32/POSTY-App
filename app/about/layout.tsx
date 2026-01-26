import type { Metadata } from "next";
import { seoConfig, i18nSeoConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "À propos | Posty - SaaS LinkedIn & Automatisation IA",
  description:
    "Découvrez Posty, l'outil SaaS qui automatise votre présence LinkedIn grâce à l'IA. Rencontrez notre équipe : Emilien Nepveu (CTO & CEO) et Côme Maubert (CMO), experts en automatisation LinkedIn et stratégie digitale.",
  keywords: [
    "Posty",
    "à propos",
    "SaaS LinkedIn",
    "automatisation LinkedIn",
    "coaching entrepreneurs",
    "IA LinkedIn",
    "personal branding",
    "Emilien Nepveu",
    "Côme Maubert",
    "équipe Posty",
    "générateur posts LinkedIn",
  ],
  authors: [
    { name: "Emilien Nepveu", url: "https://www.linkedin.com/in/e-nepveu-58a38127a/" },
    { name: "Côme Maubert" },
  ],
  creator: "Posty",

  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "en_US",
    url: `${seoConfig.siteUrl}/about`,
    siteName: "Posty",
    title: "À propos de Posty - Notre Équipe & Notre Mission",
    description:
      "Posty : l'outil SaaS qui automatise votre présence LinkedIn. Rencontrez Emilien Nepveu (CEO) et Côme Maubert (CMO).",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Posty - À propos de l'équipe",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "À propos de Posty - Notre Équipe & Notre Mission",
    description:
      "Posty : l'outil SaaS qui automatise votre présence LinkedIn. Rencontrez notre équipe d'experts.",
    images: ["/og-image.png"],
    creator: "@posty_app",
  },

  alternates: i18nSeoConfig.getAlternates("/about"),

  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
