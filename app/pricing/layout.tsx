import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Tarifs - Plans et Abonnements",
  description:
    "Découvrez les offres Posty : Free, Pro et Max. Automatisez LinkedIn et générez des prospects qualifiés avec l'IA. Plan gratuit disponible.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
