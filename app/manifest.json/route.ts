/**
 * Web App Manifest for Posty
 * Enables PWA features and app store discoverability
 */

import { NextResponse } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

export async function GET() {
  const manifest = {
    name: "Posty – Generate More LinkedIn Leads with AI",
    short_name: "Posty",
    description:
      "Automate your LinkedIn presence and attract qualified prospects with AI. Create professional posts in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFBFC",
    theme_color: "#F8A35D",
    orientation: "portrait-primary",
    scope: "/",
    lang: "fr",
    dir: "ltr",
    categories: ["business", "productivity", "social"],
    icons: [
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    screenshots: [
      {
        src: "/og-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "Posty Homepage",
      },
    ],
    shortcuts: [
      {
        name: "New Post",
        short_name: "New",
        description: "Create a new LinkedIn post",
        url: "/app",
        icons: [{ src: "/favicon-192.png", sizes: "192x192" }],
      },
      {
        name: "History",
        short_name: "History",
        description: "View your post history",
        url: "/history",
        icons: [{ src: "/favicon-192.png", sizes: "192x192" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    // PWA features
    display_override: ["standalone", "minimal-ui"],
    // Share target for receiving shared content
    share_target: {
      action: "/app",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        text: "idea",
      },
    },
    // Protocol handlers
    protocol_handlers: [
      {
        protocol: "web+posty",
        url: "/app?action=%s",
      },
    ],
    // Edge side panel (experimental)
    edge_side_panel: {
      preferred_width: 400,
    },
    // Launch handler
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    // Handle links
    handle_links: "preferred",
    // Capture links
    capture_links: "existing-client-navigate",
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
