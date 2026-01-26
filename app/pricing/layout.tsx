import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://posty-app.vercel.app";

export const metadata: Metadata = {
  title: "Tarifs - Plans et Abonnements",
  description:
    "Découvrez nos offres POSTY : gratuit, Pro ou Business. Choisissez le plan adapté à vos besoins pour générer des posts LinkedIn percutants.",
  openGraph: {
    title: "Tarifs POSTY - Plans et Abonnements",
    description:
      "Découvrez nos offres : gratuit, Pro ou Business. Générez des posts LinkedIn percutants avec l'IA.",
    url: `${baseUrl}/pricing`,
    type: "website",
  },
  twitter: {
    title: "Tarifs POSTY - Plans et Abonnements",
    description:
      "Découvrez nos offres : gratuit, Pro ou Business. Générez des posts LinkedIn percutants.",
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
