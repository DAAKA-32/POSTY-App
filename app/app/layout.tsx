import { Metadata } from "next";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Application",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
