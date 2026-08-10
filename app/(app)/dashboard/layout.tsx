import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
