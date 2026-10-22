import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Pricing — Pro and Max plans",
  description:
    "Posty AI pricing: Pro at €12.90/month and Max at €19.90/month, after a 30-day free trial. Choose how much of your marketing your AI agent takes off your hands.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Pricing — Pro and Max plans · Posty AI",
    description:
      "Pro at €12.90/month and Max at €19.90/month, after a 30-day free trial.",
    url: `${baseUrl}/subscription`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Pricing — Pro and Max plans · Posty AI",
    description:
      "Pro at €12.90/month and Max at €19.90/month, after a 30-day free trial.",
  },
  alternates: {
    canonical: `${baseUrl}/subscription`,
  },
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SwipeBackProvider>
      {/* Structured data. No FAQPage here: this page shows its own pricing FAQ,
          and the schema must match visible content. */}
      <ProductJsonLd name="Posty AI Pro" description="Posty AI, the AI marketing agent for professionals: Pro plan." price={12.90} />
      <ProductJsonLd name="Posty AI Max" description="Posty AI, the AI marketing agent for professionals: Max plan." price={19.90} />
      <BreadcrumbJsonLd items={[
        { name: "Posty AI", url: `${baseUrl}` },
        { name: "Pricing" },
      ]} />
      {children}
    </SwipeBackProvider>
  );
}
