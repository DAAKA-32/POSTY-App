import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Tarifs - Plans et Abonnements",
  description:
    "Découvrez les offres Posty : Pro et Max. Automatisez LinkedIn et générez des prospects qualifiés avec l'IA. Essai gratuit 7 jours.",
  openGraph: {
    title: "Tarifs Posty - Plans et Abonnements",
    description:
      "Découvrez les offres Posty : Pro et Max. Générez des prospects LinkedIn qualifiés avec l'IA.",
    url: `${baseUrl}/pricing`,
    type: "website",
  },
  twitter: {
    title: "Tarifs Posty - Plans et Abonnements",
    description:
      "Découvrez les offres Posty : Pro et Max. Générez des prospects LinkedIn qualifiés avec l'IA.",
  },
  alternates: {
    canonical: `${baseUrl}/pricing`,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
