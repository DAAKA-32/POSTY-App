import type { Metadata } from "next";
import { seoConfig, i18nSeoConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "About Posty | AI LinkedIn Content Platform",
  description:
    "Meet the team behind Posty — the AI-powered LinkedIn content platform that helps professionals turn posts into clients. Founded by Emilien Nepveu (Co-CEO & CTO) and Côme Maubert (Co-CEO & CFO).",
  keywords: [
    "Posty",
    "about",
    "LinkedIn SaaS",
    "LinkedIn automation",
    "AI LinkedIn",
    "personal branding",
    "Emilien Nepveu",
    "Côme Maubert",
    "Posty team",
    "LinkedIn post generator",
  ],
  authors: [
    { name: "Emilien Nepveu", url: "https://www.linkedin.com/in/emilien-nepveu-58a38127a/" },
    { name: "Côme Maubert", url: "https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/" },
  ],
  creator: "Posty",

  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "fr_FR",
    url: `${seoConfig.siteUrl}/about`,
    siteName: "Posty AI",
    title: "About Posty — Our Team & Mission",
    description:
      "Posty helps professionals automate LinkedIn and generate qualified leads with AI. Meet our founding team.",
    images: [
      {
        url: `${seoConfig.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "About Posty AI - Our Team",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "About Posty — Our Team & Mission",
    description:
      "Posty helps professionals automate LinkedIn and generate qualified leads with AI. Meet our founding team.",
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
