import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { FaqJsonLd, HomepageJsonLd } from "@/components/seo/JsonLd";
import { en } from "@/lib/i18n/translations/en";

/**
 * Homepage — the brand's reference page for "Posty", "Posty AI", "Posty IA".
 *
 * Server Component on purpose: it owns the homepage metadata (nothing else
 * inherits its canonical) and its structured data, while the landing itself
 * (components/landing/LandingPage.tsx) is server-rendered for every visitor so
 * crawlers read the headline and sections without running JavaScript.
 */

const TITLE = "Posty AI — Your AI Marketing Agent for Professionals";
const DESCRIPTION =
  "Posty AI is the AI marketing agent for professionals. It learns your business, writes your content and publishes it automatically on your pro networks.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Posty AI",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: TITLE,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

// Same keys as the visible FAQ (LandingPage getFaqItems) in the server-rendered
// language (English), so the FAQPage schema always matches the page.
const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const faq = FAQ_KEYS.map((n) => ({
  question: en.landing[`faqQ${n}`],
  answer: en.landing[`faqA${n}`],
}));

export default function HomePage() {
  return (
    <>
      <HomepageJsonLd />
      <FaqJsonLd questions={faq} />
      <LandingPage />
    </>
  );
}
