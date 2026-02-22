import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à POSTY pour créer des posts LinkedIn percutants. Accédez à votre espace de génération de contenu IA.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Connexion - POSTY",
    description:
      "Connectez-vous à POSTY pour créer des posts LinkedIn percutants avec l'IA.",
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
