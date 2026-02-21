import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://tink-xi.vercel.app";

export const metadata: Metadata = {
  title: "Tarifs - Plans Pro et Max",
  description:
    "Découvrez les offres POSTY : Pro à 12,90€/mois ou Max à 19,90€/mois. Générez des posts LinkedIn professionnels avec l'IA. Essai gratuit 7 jours.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Tarifs POSTY - Plans Pro et Max",
    description:
      "Générez des posts LinkedIn professionnels avec l'IA. Plans Pro et Max avec essai gratuit 7 jours.",
    url: `${baseUrl}/subscription`,
    type: "website",
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
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
