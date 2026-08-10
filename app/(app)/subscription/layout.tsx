import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";
import { FaqJsonLd, ProductJsonLd, BreadcrumbJsonLd, postyFaqData } from "@/components/seo/JsonLd";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Pricing — Pro & Max Plans | Posty AI",
  description:
    "Choose the right Posty plan for your LinkedIn strategy. Pro at $12.90/mo or Max at $19.90/mo. Generate unlimited AI-powered posts and turn content into clients. Free plan available.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Posty AI Pricing — Pro & Max Plans",
    description:
      "Unlock unlimited AI-powered LinkedIn posts. Choose Pro or Max and start turning your content into clients.",
    url: `${baseUrl}/subscription`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Posty AI Pricing — Pro & Max Plans",
    description:
      "Unlock unlimited AI-powered LinkedIn posts. Choose your plan and start today.",
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
      {/* Structured data for rich snippets */}
      <FaqJsonLd questions={postyFaqData.en} />
      <ProductJsonLd name="Posty Pro" description="AI-powered LinkedIn post generator — Pro plan with unlimited posts, personalized AI, and LinkedIn publishing." price={12.90} />
      <ProductJsonLd name="Posty Max" description="AI-powered LinkedIn post generator — Max plan with dual AI responses, advanced coaching, and priority support." price={19.90} />
      <BreadcrumbJsonLd items={[
        { name: "Posty AI", url: `${baseUrl}` },
        { name: "Pricing" },
      ]} />
      {children}
    </SwipeBackProvider>
  );
}
