import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Tarifs - Plans Pro et Max",
  description:
    "Découvrez les offres Posty : Pro à 12,90€/mois ou Max à 19,90€/mois. Automatisez LinkedIn et générez des prospects avec l'IA. Essai gratuit 7 jours.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
