import { Metadata } from "next";
import SwipeBackProvider from "@/components/providers/SwipeBackProvider";

export const metadata: Metadata = {
  title: "Posts programmés - Posty",
  description: "Gérez vos posts programmés sur LinkedIn",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SwipeBackProvider>{children}</SwipeBackProvider>;
}
