import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { PremiumToaster } from "@/components/ui/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { QuotaProvider } from "@/contexts/QuotaContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppProvider from "@/components/providers/AppProvider";
import GlobalCommandPalette from "@/components/providers/GlobalCommandPalette";
import KeyboardNavigationProvider from "@/components/providers/KeyboardNavigationProvider";
import SkipLinks from "@/components/accessibility/SkipLinks";
import DevTools from "@/components/dev/DevTools";
import { HomepageJsonLd } from "@/components/seo/JsonLd";
import HreflangTags from "@/components/seo/HreflangTags";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

// SEO Configuration
const siteConfig = {
  name: "POSTY",
  url: process.env.NEXT_PUBLIC_BASE_URL || "https://posty-app.vercel.app",
  defaultLocale: "fr" as const,
  supportedLocales: ["fr", "en"] as const,
};

export const metadata: Metadata = {
  // Base metadata
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "POSTY - Générateur de Posts LinkedIn IA",
    template: "%s | POSTY",
  },
  description:
    "Créez des posts LinkedIn percutants en quelques secondes grâce à l'IA. Générez du contenu professionnel optimisé pour maximiser votre engagement.",
  keywords: [
    "LinkedIn",
    "générateur posts",
    "IA",
    "intelligence artificielle",
    "marketing LinkedIn",
    "contenu professionnel",
    "réseaux sociaux",
    "personal branding",
    "copywriting",
    "engagement LinkedIn",
  ],
  authors: [
    { name: "POSTY Team" },
    { name: "Emilien Nepveu", url: "https://www.linkedin.com/in/e-nepveu-58a38127a/" },
  ],
  creator: "Emilien Nepveu",
  publisher: "POSTY",

  // Icons - Using logo for favicon
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg", sizes: "32x32" },
      { url: "/logo.jpg", type: "image/jpeg", sizes: "16x16" },
    ],
    shortcut: "/logo.jpg",
    apple: [
      { url: "/logo.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
  },

  // PWA / App config
  applicationName: "POSTY",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POSTY",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "en_US",
    url: siteConfig.url,
    siteName: "POSTY",
    title: "POSTY - Générateur de Posts LinkedIn IA",
    description:
      "Créez des posts LinkedIn percutants en quelques secondes grâce à l'IA. Générez du contenu professionnel optimisé pour maximiser votre engagement.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "POSTY - Générateur de Posts LinkedIn IA",
        type: "image/png",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "POSTY - Générateur de Posts LinkedIn IA",
    description:
      "Créez des posts LinkedIn percutants en quelques secondes grâce à l'IA.",
    images: ["/og-image.png"],
    creator: "@posty_app",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Canonical & International SEO (hreflang)
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "fr-FR": `${siteConfig.url}?lang=fr`,
      "en-US": `${siteConfig.url}?lang=en`,
      "x-default": siteConfig.url,
    },
  },

  // Category
  category: "technology",
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
    <html lang="fr" className={poppins.variable} suppressHydrationWarning>
      <head>
        {/* Theme initialization + Web3/MetaMask error suppressor */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress MetaMask/Web3 wallet errors - Posty doesn't use crypto wallets
                // This prevents "Failed to connect to MetaMask" console spam
                window.addEventListener('error', function(e) {
                  if (e.message && (
                    e.message.includes('MetaMask') ||
                    e.message.includes('ethereum') ||
                    e.message.includes('web3') ||
                    e.message.includes('inpage')
                  )) {
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && (
                    (typeof e.reason === 'string' && e.reason.includes('MetaMask')) ||
                    (e.reason.message && e.reason.message.includes('MetaMask')) ||
                    (e.reason.message && e.reason.message.includes('ethereum'))
                  )) {
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                  }
                }, true);

                // Theme initialization
                try {
                  var theme = localStorage.getItem('posty-theme');
                  var root = document.documentElement;
                  if (theme === 'light') {
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                    root.setAttribute('data-theme', 'light');
                  } else {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    root.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="POSTY" />

        {/* Theme color for Safari iOS status bar and browser chrome */}
        {/* Light mode: White/Light gray background */}
        <meta name="theme-color" content="#FAFBFC" media="(prefers-color-scheme: light)" />
        {/* Dark mode: Dark background matching app */}
        <meta name="theme-color" content="#0B0E11" media="(prefers-color-scheme: dark)" />
        {/* Default fallback */}
        <meta name="theme-color" content="#FAFBFC" />

        {/* Preconnect to external origins for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebaseapp.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://www.linkedin.com" />

        {/* International SEO - hreflang tags */}
        <HreflangTags currentPath="/" />

        {/* JSON-LD Structured Data */}
        <HomepageJsonLd />
      </head>
      <body className={`antialiased ${poppins.className}`}>
        <SkipLinks />
        <ThemeProvider>
        <KeyboardNavigationProvider>
        <AppProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <LanguageProvider>
                <QuotaProvider>
                  <LinkedInProvider>
                    <SchedulingProvider>
                      {children}
                      <GlobalCommandPalette />
                    </SchedulingProvider>
                  </LinkedInProvider>
                </QuotaProvider>
              </LanguageProvider>
            </SubscriptionProvider>
            <PremiumToaster />
          </AuthProvider>
          <DevTools />
        </AppProvider>
        </KeyboardNavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
