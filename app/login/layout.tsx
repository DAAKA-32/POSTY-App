import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Posty and generate high-converting LinkedIn posts using AI. Turn your content into clients automatically.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Sign In — Posty AI LinkedIn Post Generator",
    description:
      "Sign in to Posty and create AI-powered LinkedIn posts that attract clients.",
    url: `${baseUrl}/login`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Sign In — Posty AI",
    description:
      "Sign in to Posty and create AI-powered LinkedIn posts that attract clients.",
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
