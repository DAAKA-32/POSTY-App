import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for Posty iOS app.
 *
 * Strategy: "Hybrid shell" — the native app loads the production web app
 * at https://postyapp.ai. This keeps Next.js SSR, API routes, Firebase,
 * and Stripe intact. Native features (splash, status bar, push, etc.)
 * are added on top via Capacitor plugins.
 */
const config: CapacitorConfig = {
  appId: "ai.postyapp.mobile",
  appName: "Posty",
  // Local fallback assets (offline screen, splash). The remote site is
  // loaded via `server.url` below.
  webDir: "capacitor-shell",
  server: {
    url: "https://postyapp.ai",
    // Restrict which remote origins the WebView can navigate to.
    allowNavigation: [
      "postyapp.ai",
      "*.postyapp.ai",
      "*.firebaseapp.com",
      "*.firebase.com",
      "*.googleapis.com",
      "accounts.google.com",
      "checkout.stripe.com",
      "*.stripe.com",
    ],
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0a0a0a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0a",
    },
  },
};

export default config;
