import type { Metadata } from "next";
import { seoConfig, i18nSeoConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: { absolute: "About Posty AI — Mission and Team" },
  description:
    "Meet the team behind Posty AI, the AI marketing agent for professionals. Founded by Emilien Nepveu (Co-CEO & CTO) and Côme Maubert (Co-CEO & CFO).",
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
    "AI marketing agent",
  ],
  authors: [
    { name: "Emilien Nepveu", url: "https://www.linkedin.com/in/emilien-nepveu-58a38127a/" },
    { name: "Côme Maubert", url: "https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/" },
  ],
  creator: "Posty",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${seoConfig.siteUrl}/about`,
    siteName: "Posty AI",
    title: "About Posty AI — Mission and Team",
    description:
      "Posty AI is the AI marketing agent for professionals. Meet the founding team and our mission.",
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
    title: "About Posty AI — Mission and Team",
    description:
      "Posty AI is the AI marketing agent for professionals. Meet the founding team and our mission.",
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
