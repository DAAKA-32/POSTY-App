import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://tink-xi.vercel.app";

export const metadata: Metadata = {
  title: "Inscription Gratuite",
  description:
    "Créez votre compte POSTY gratuitement. Commencez à générer des posts LinkedIn percutants en quelques secondes avec l'IA.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Inscription Gratuite - POSTY",
    description:
      "Créez votre compte POSTY gratuitement. Générez des posts LinkedIn percutants avec l'IA.",
    url: `${baseUrl}/signup`,
    type: "website",
  },
  alternates: {
    canonical: `${baseUrl}/signup`,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
