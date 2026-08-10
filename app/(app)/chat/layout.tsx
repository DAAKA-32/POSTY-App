import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouvelle Conversation",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
