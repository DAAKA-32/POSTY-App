import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Legal Notices | Posty AI",
  description:
    "Posty AI legal notices. Company information, hosting details, and regulatory information.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${baseUrl}/legal/notices` },
};

export default function NoticesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
