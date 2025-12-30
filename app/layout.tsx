import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import AppProvider from "@/components/providers/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "POSTY - Generateur de Posts LinkedIn",
  description: "Creez des posts LinkedIn percutants en quelques clics",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">
        <AppProvider>
          <AuthProvider>
            <LinkedInProvider>
              {children}
            </LinkedInProvider>
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#1a1a1a",
                  color: "#fff",
                  border: "1px solid #2a2a2a",
                },
              }}
            />
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
