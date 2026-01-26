import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
