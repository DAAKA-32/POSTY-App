import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import { QuotaProvider } from "@/contexts/QuotaContext";
import AppProvider from "@/components/providers/AppProvider";
import GlobalCommandPalette from "@/components/providers/GlobalCommandPalette";
import KeyboardNavigationProvider from "@/components/providers/KeyboardNavigationProvider";
import SkipLinks from "@/components/accessibility/SkipLinks";
import DevTools from "@/components/dev/DevTools";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "POSTY - Generateur de Posts LinkedIn",
  description: "Creez des posts LinkedIn percutants en quelques clics",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POSTY",
  },
  formatDetection: {
    telephone: false,
  },
};

// Disable zoom for native mobile experience
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`dark ${poppins.variable}`}>
      <body className={`antialiased ${poppins.className}`}>
        <SkipLinks />
        <KeyboardNavigationProvider>
        <AppProvider>
          <AuthProvider>
            <QuotaProvider>
              <LinkedInProvider>
                {children}
                <GlobalCommandPalette />
              </LinkedInProvider>
            </QuotaProvider>
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
          <DevTools />
        </AppProvider>
        </KeyboardNavigationProvider>
      </body>
    </html>
  );
}
