import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

export const metadata: Metadata = {
  title: "Historique",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
