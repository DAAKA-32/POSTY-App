import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Sign Up Free | Posty AI",
  description:
    "Create your free Posty account. Generate high-converting LinkedIn posts with AI and turn your content into clients. Free plan available.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Sign Up Free — Posty AI LinkedIn Post Generator",
    description:
      "Create your free Posty account. Generate LinkedIn posts with AI that attract qualified leads.",
    url: `${baseUrl}/signup`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Sign Up Free — Posty AI",
    description:
      "Create your free Posty account and start generating AI-powered LinkedIn posts.",
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
