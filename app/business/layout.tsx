import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Business — Posty for teams & enterprises",
  description:
    "Deploy Posty across your organization: multi-account management, advanced automation, dedicated support and custom integrations.",
  alternates: {
    canonical: `${baseUrl}/business`,
  },
  openGraph: {
    title: "Posty Business — for teams & enterprises",
    description:
      "Multi-account, advanced automation, dedicated support, custom integrations.",
    url: `${baseUrl}/business`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
