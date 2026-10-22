import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Posty AI account.",
  // Utility page: kept out of the index so it never competes with the homepage
  // on brand searches; still crawlable (robots.txt) so Google sees this noindex.
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Sign in · Posty AI",
    description: "Sign in to your Posty AI account.",
    url: `${baseUrl}/login`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Sign in · Posty AI",
    description: "Sign in to your Posty AI account.",
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
