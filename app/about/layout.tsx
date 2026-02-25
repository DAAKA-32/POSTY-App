import type { Metadata } from "next";
import { seoConfig, i18nSeoConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "À propos | Posty - SaaS LinkedIn & Automatisation IA",
  description:
    "Découvrez Posty, l'outil SaaS qui automatise votre présence LinkedIn et génère des prospects qualifiés grâce à l'IA. Rencontrez Emilien Nepveu (Co-CEO & CTO) et Côme Maubert (Co-CEO & CFO).",
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
      "Posty : automatisez votre présence LinkedIn et générez des prospects qualifiés. Rencontrez Emilien Nepveu (Co-CEO & CTO) et Côme Maubert (Co-CEO & CFO).",
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
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
      "Posty : automatisez votre présence LinkedIn et générez des prospects qualifiés. Rencontrez notre équipe.",
    images: [`${seoConfig.siteUrl}/og-image.png`],
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
