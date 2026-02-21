import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://tink-xi.vercel.app";

export const metadata: Metadata = {
  title: "Tarifs - Plans et Abonnements",
  description:
    "Découvrez nos offres POSTY : Pro et Max. Choisissez le plan adapté à vos besoins pour générer des posts LinkedIn percutants avec l'IA.",
  openGraph: {
    title: "Tarifs POSTY - Plans et Abonnements",
    description:
      "Découvrez nos offres POSTY : Pro et Max. Générez des posts LinkedIn percutants avec l'IA.",
    url: `${baseUrl}/pricing`,
    type: "website",
  },
  twitter: {
    title: "Tarifs POSTY - Plans et Abonnements",
    description:
      "Découvrez nos offres POSTY : Pro et Max. Générez des posts LinkedIn percutants avec l'IA.",
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
