import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export const metadata: Metadata = {
  title: "Privacy Policy | Posty AI",
  description:
    "Read Posty's privacy policy. Learn how we collect, use, and protect your data when using our AI LinkedIn post generator.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${baseUrl}/legal/privacy` },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
