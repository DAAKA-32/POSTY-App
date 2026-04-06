import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Terms of Service | Posty AI",
  description:
    "Read Posty's terms of service. Understand the conditions for using our AI-powered LinkedIn content generation platform.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${baseUrl}/legal/terms` },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
