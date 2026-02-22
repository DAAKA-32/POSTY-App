import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Inscription Gratuite",
  description:
    "Créez votre compte Posty App gratuitement. Automatisez votre LinkedIn et générez des prospects qualifiés avec l'IA. Essai gratuit 7 jours.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Inscription Gratuite - Posty App",
    description:
      "Créez votre compte Posty App gratuitement. Générez des prospects LinkedIn qualifiés avec l'IA.",
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
