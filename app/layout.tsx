import type { Metadata, Viewport } from "next";
import { Poppins, Playfair_Display, Inter } from "next/font/google";
import { PremiumToaster } from "@/components/ui/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import { FacebookProvider } from "@/contexts/FacebookContext";
import { ThreadsProvider } from "@/contexts/ThreadsContext";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { QuotaProvider } from "@/contexts/QuotaContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppProvider from "@/components/providers/AppProvider";
import GlobalCommandPalette from "@/components/providers/GlobalCommandPalette";
import KeyboardNavigationProvider from "@/components/providers/KeyboardNavigationProvider";
import SkipLinks from "@/components/accessibility/SkipLinks";
import CookieBanner from "@/components/ui/CookieBanner";
import LegalUpdateNotification from "@/components/ui/LegalUpdateNotification";
import LandscapeBlocker from "@/components/ui/LandscapeBlocker";
import { HomepageJsonLd, HowToJsonLd, FaqJsonLd, postyHowToData, postyFaqData } from "@/components/seo/JsonLd";
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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

// SEO Configuration
const siteConfig = {
  name: "Posty AI",
  url: process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai",
  defaultLocale: "en" as const,
  supportedLocales: ["en", "fr"] as const,
};

export const metadata: Metadata = {
  // Base metadata
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Posty AI – Turn LinkedIn posts into clients with AI",
    template: "%s | Posty AI",
  },
  description:
    "Create high-performing LinkedIn posts in seconds with AI. Posty generates ready-to-publish content tailored to your audience. Start free today.",
  keywords: [
    "Posty",
    "Posty AI",
    "LinkedIn post generator",
    "AI LinkedIn tool",
    "LinkedIn automation",
    "AI content creation",
    "LinkedIn leads",
    "personal branding",
    "LinkedIn marketing",
    "LinkedIn engagement",
    "B2B content",
  ],
  authors: [
    { name: "POSTY Team" },
    { name: "Emilien Nepveu", url: "https://www.linkedin.com/in/emilien-nepveu-58a38127a/" },
    { name: "Côme Maubert", url: "https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/" },
  ],
  creator: "Emilien Nepveu & Côme Maubert",
  publisher: "Posty AI",

  // Icons - Favicon multi-size
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },

  // PWA / App config
  applicationName: "Posty AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Posty AI",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "fr_FR",
    url: siteConfig.url,
    siteName: "Posty AI",
    title: "Posty AI – Turn LinkedIn posts into clients with AI",
    description:
      "Create high-performing LinkedIn posts in seconds with AI. Posty generates ready-to-publish content tailored to your audience.",
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Posty AI – Turn LinkedIn posts into clients with AI",
        type: "image/jpeg",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "Posty AI – Turn LinkedIn posts into clients with AI",
    description:
      "Create high-performing LinkedIn posts in seconds with AI. Start free today.",
    images: [`${siteConfig.url}/og-image.jpg`],
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

  // Google Search Console verification
  verification: {
    google: "zcr5lILEk8sjfmbrfGc-P8sprWmLx4bg6-Q8gD38TGo",
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
    <html lang="en" className={`${poppins.variable} ${inter.variable} ${playfair.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
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
                  var root = document.documentElement;
                  var path = window.location.pathname;
                  // Public pages always render in light mode (no dark flash)
                  var isPublicPage = path === '/' || path.startsWith('/about') || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/legal') || path.startsWith('/pricing') || path.startsWith('/onboarding') || path.startsWith('/subscription') || path.startsWith('/ai-linkedin') || path.startsWith('/write-linkedin') || path.startsWith('/linkedin-post') || path.startsWith('/generate-linkedin');
                  if (isPublicPage) {
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                    root.setAttribute('data-theme', 'light');
                  } else {
                    var theme = localStorage.getItem('posty-theme');
                    if (theme === 'dark') {
                      root.classList.add('dark');
                      root.style.colorScheme = 'dark';
                      root.setAttribute('data-theme', 'dark');
                    } else {
                      root.classList.add('light');
                      root.style.colorScheme = 'light';
                      root.setAttribute('data-theme', 'light');
                    }
                  }
                } catch (e) {
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.setAttribute('data-theme', 'light');
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
        <meta name="apple-mobile-web-app-title" content="Posty AI" />

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
        <HowToJsonLd {...postyHowToData.en} />
        <FaqJsonLd questions={postyFaqData.en} />
      </head>
      <body className={`antialiased ${poppins.className}`}>
        {/* Portrait-only enforcement: blocks landscape on mobile phones */}
        <LandscapeBlocker />
        <ThemeProvider>
        <KeyboardNavigationProvider>
        <AppProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <LanguageProvider>
                <SkipLinks />
                <QuotaProvider>
                  <LinkedInProvider>
                    <FacebookProvider>
                      <ThreadsProvider>
                        <SchedulingProvider>
                          {children}
                          <GlobalCommandPalette />
                        </SchedulingProvider>
                      </ThreadsProvider>
                    </FacebookProvider>
                  </LinkedInProvider>
                </QuotaProvider>
                <CookieBanner />
                <LegalUpdateNotification />
              </LanguageProvider>
            </SubscriptionProvider>
            <PremiumToaster />
          </AuthProvider>
        </AppProvider>
        </KeyboardNavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
