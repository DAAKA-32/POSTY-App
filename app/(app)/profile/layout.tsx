import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

export const metadata: Metadata = {
  title: "Profil",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
