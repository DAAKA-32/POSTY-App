import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à Posty pour automatiser votre LinkedIn et générer des prospects qualifiés avec l'IA.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Connexion - Posty",
    description:
      "Connectez-vous à Posty pour automatiser votre LinkedIn et générer des prospects avec l'IA.",
    url: `${baseUrl}/login`,
    type: "website",
  },
  alternates: {
    canonical: `${baseUrl}/login`,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
