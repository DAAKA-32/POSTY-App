import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PremiumToaster } from "@/components/ui/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import { FacebookProvider } from "@/contexts/FacebookContext";
import { ThreadsProvider } from "@/contexts/ThreadsContext";
import { BlueskyProvider } from "@/contexts/BlueskyContext";
import { MastodonProvider } from "@/contexts/MastodonContext";
import { DiscordProvider } from "@/contexts/DiscordContext";
import { XProvider } from "@/contexts/XContext";
import { InstagramProvider } from "@/contexts/InstagramContext";
import { RedditProvider } from "@/contexts/RedditContext";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { QuotaProvider } from "@/contexts/QuotaContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SidebarPostsProvider } from "@/contexts/SidebarPostsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppProvider from "@/components/providers/AppProvider";
import KeyboardNavigationProvider from "@/components/providers/KeyboardNavigationProvider";
import SkipLinks from "@/components/accessibility/SkipLinks";
import PersistentMobileHeader from "@/components/layout/PersistentMobileHeader";
import { HomepageJsonLd, HowToJsonLd, postyHowToData } from "@/components/seo/JsonLd";
import HreflangTags from "@/components/seo/HreflangTags";
import "./globals.css";

// Secondary widgets — never on the critical path. Deferring them shaves the
// root layout's eager module graph, which Turbopack must rebuild on every
// dev compile. None of these need SSR (overlays, listeners, post-mount UX).
// They live in a Client Component module because Next.js 16 forbids
// `dynamic(..., { ssr: false })` from running inside Server Components, and
// keeping this layout as a Server Component preserves SEO/metadata behavior.
import {
  StrategistDrawer,
  AutonomousBatchBanner,
  WhatsNewModal,
  GlobalCommandPalette,
  CookieBanner,
  LegalUpdateNotification,
  LandscapeBlocker,
  AnalyticsTracker,
} from "@/components/providers/DeferredLayoutWidgets";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    default: "Posty IA — Turn LinkedIn posts into clients with AI",
    template: "%s · Posty IA",
  },
  description:
    "Posty (Posty AI, postyapp.ai) — Create high-performing LinkedIn posts in seconds with AI. Posty generates ready-to-publish content tailored to your audience. Start free today.",
  keywords: [
    "Posty",
    "Posty AI",
    "PostyApp",
    "Posty App",
    "postyapp.ai",
    "Posty LinkedIn",
    "Posty AI LinkedIn",
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
    siteName: "Posty",
    title: "Posty — Posty AI · Turn LinkedIn posts into clients with AI",
    description:
      "Posty (Posty AI) — Create high-performing LinkedIn posts in seconds with AI. Posty generates ready-to-publish content tailored to your audience.",
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Posty AI — Turn LinkedIn posts into clients with AI",
        type: "image/jpeg",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    site: "@posty_app",
    title: "Posty — Posty AI · Turn LinkedIn posts into clients with AI",
    description:
      "Posty (Posty AI) — Create high-performing LinkedIn posts in seconds with AI. Start free today.",
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
    // translate="no" + notranslate disable browser auto-translation site-wide.
    // Posty has its own i18n in 10 languages; layering Chrome / Google Translate
    // on top produced broken output ("Total aujourd'hui d'aujourd'hui",
    // mangled Stripe CTAs). Critical leaves (brand, prices, AI-generated posts)
    // also carry `notranslate` for the manual-translate override case.
    <html lang="en" translate="no" className={`${inter.variable} notranslate`} data-scroll-behavior="smooth" suppressHydrationWarning>
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

                  // Page-tone signature gradient is applied directly as a
                  // Tailwind utility on MainLayout's outer wrapper. No inline
                  // style/script gradient logic needed — the SSR'd class is
                  // already in the initial HTML.
                } catch (e) {
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.setAttribute('data-theme', 'light');
                }

                // Scrollbar width detection — exposes --app-scrollbar-width on
                // :root so the fixed chat-input backdrop can stop short of the
                // scrollbar gutter and stop fading the scrollbar thumb at the
                // bottom of the chat scroll container. Returns 0 on overlay-
                // scrollbar platforms (touch, macOS default), which is exactly
                // what we want — no gutter needed there.
                function measureAppScrollbarWidth() {
                  try {
                    var probe = document.createElement('div');
                    probe.setAttribute('aria-hidden', 'true');
                    probe.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:50px;height:50px;overflow:scroll;visibility:hidden;pointer-events:none;';
                    document.body.appendChild(probe);
                    var w = probe.offsetWidth - probe.clientWidth;
                    document.body.removeChild(probe);
                    document.documentElement.style.setProperty('--app-scrollbar-width', w + 'px');
                  } catch (err) { /* leave the CSS fallback (0px) in place */ }
                }
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', measureAppScrollbarWidth, { once: true });
                } else {
                  measureAppScrollbarWidth();
                }
                // Re-measure on viewport changes (zoom, OS-level scrollbar
                // preference toggles, dev-tools resize) so the gutter stays
                // accurate without a page reload.
                window.addEventListener('resize', measureAppScrollbarWidth, { passive: true });
              })();
            `,
          }}
        />
        {/* Disable Google Translate toolbar prompts site-wide (paired with
            translate="no" on <html>). The toolbar honors this meta even when
            users would otherwise see the "Translate this page?" banner. */}
        <meta name="google" content="notranslate" />

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
        {/* next/font handles font preconnect automatically */}
        <link rel="preconnect" href="https://firebaseapp.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://www.linkedin.com" />

        {/* International SEO - hreflang tags */}
        <HreflangTags currentPath="/" />

        {/* Site-wide structured data (Organization + HowTo).
            FAQPage is intentionally NOT injected here — it was causing
            "Champ FAQPage en double" errors on pages that ship their own
            page-specific FAQ (the (seo) group). FAQPage is now scoped to
            the homepage only, via app/page.tsx. */}
        <HomepageJsonLd />
        <HowToJsonLd {...postyHowToData.en} />
      </head>
      {/* `inter.variable` on <html> exposes --font-inter to globals.css.
          We deliberately do NOT slap `inter.className` here: that class would
          set `font-family` directly on <body> with a class-level specificity
          that overrides our CSS variable chain (--font-sans), which means
          Windows users would never see Segoe UI as a fallback. Letting body
          inherit from `body { font-family: var(--font-sans) }` in globals.css
          keeps the full system stack working. */}
      <body className="antialiased">
        {/* Portrait-only enforcement: blocks landscape on mobile phones */}
        <LandscapeBlocker />
        <ThemeProvider>
        <KeyboardNavigationProvider>
        <AppProvider>
          <AuthProvider>
            <SidebarPostsProvider>
            <SubscriptionProvider>
              <LanguageProvider>
                <SkipLinks />
                {/* PersistentMobileHeader lives ABOVE every page's MainLayout
                    so its DOM node is created exactly once per session and
                    never gets torn down on route change. This kills the
                    "flash square" that appeared when each page's inline
                    `<header>` was unmounted and remounted on every
                    navigation (the hamburger and logo image briefly went
                    missing between routes). Reads SidebarContext (via
                    AppProvider above) + LanguageContext (this provider). */}
                <PersistentMobileHeader />
                <QuotaProvider>
                  <LinkedInProvider>
                    <FacebookProvider>
                      <ThreadsProvider>
                        <BlueskyProvider>
                          <MastodonProvider>
                            <DiscordProvider>
                              <XProvider>
                                <InstagramProvider>
                                  <RedditProvider>
                                    <SchedulingProvider>
                                      {children}
                                      <AnalyticsTracker />
                                      <GlobalCommandPalette />
                                    </SchedulingProvider>
                                  </RedditProvider>
                                </InstagramProvider>
                              </XProvider>
                            </DiscordProvider>
                          </MastodonProvider>
                        </BlueskyProvider>
                      </ThreadsProvider>
                    </FacebookProvider>
                    {/* Strategist drawer & autonomous banner MUST live inside
                        LinkedInProvider — useStrategistEligibility calls
                        useLinkedIn() to gate access on a connected LinkedIn
                        account. Mounting them outside the provider crashes
                        at runtime with "useLinkedIn must be used within a
                        LinkedInProvider". */}
                    <StrategistDrawer />
                    <AutonomousBatchBanner />
                    {/* Release notes popup — surfaces what's new for
                        authenticated users once per RELEASE_KEY bump. */}
                    <WhatsNewModal />
                  </LinkedInProvider>
                </QuotaProvider>
                <CookieBanner />
                <LegalUpdateNotification />
              </LanguageProvider>
            </SubscriptionProvider>
            </SidebarPostsProvider>
            <PremiumToaster />
          </AuthProvider>
        </AppProvider>
        </KeyboardNavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
