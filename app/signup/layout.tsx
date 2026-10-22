import { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create your Posty AI account and start with a 30-day free trial of your AI marketing agent.",
  // Utility page: kept out of the index so it never competes with the homepage
  // on brand searches; still crawlable (robots.txt) so Google sees this noindex.
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Create your account · Posty AI",
    description:
      "Create your Posty AI account and start with a 30-day free trial of your AI marketing agent.",
    url: `${baseUrl}/signup`,
    type: "website",
    siteName: "Posty AI",
  },
  twitter: {
    card: "summary",
    title: "Create your account · Posty AI",
    description:
      "Create your Posty AI account and start with a 30-day free trial of your AI marketing agent.",
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
