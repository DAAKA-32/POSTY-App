import { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";

/**
 * Robots.txt Configuration for POSTY
 * Optimized for search engines and AI crawlers (2025)
 *
 * Public pages: /, /pricing, /subscription, /login, /signup, /legal/*
 * Protected pages: /app/*, /chat/*, /history/*, /profile/*, /settings/*
 *
 * AI Crawlers: Allowed to access public pages + llms.txt for context
 */
export default function robots(): MetadataRoute.Robots {
  // Common disallowed paths for all crawlers
  const protectedPaths = [
    "/app/",
    "/chat/",
    "/history/",
    "/profile/",
    "/settings/",
    "/onboarding/",
    "/checkout/",
    "/api/",
  ];

  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/subscription",
          "/login",
          "/signup",
          "/legal/",
          "/llms.txt",
        ],
        disallow: [...protectedPaths, "/_next/", "/static/"],
      },
      // Google - primary search engine
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/subscription",
          "/login",
          "/signup",
          "/legal/",
          "/llms.txt",
        ],
        disallow: protectedPaths,
      },
      // Bing - secondary search engine
      {
        userAgent: "Bingbot",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/subscription",
          "/login",
          "/signup",
          "/legal/",
          "/llms.txt",
        ],
        disallow: protectedPaths,
      },
      // ChatGPT/OpenAI crawler - AI search
      {
        userAgent: "GPTBot",
        allow: ["/", "/about", "/pricing", "/subscription", "/llms.txt"],
        disallow: [...protectedPaths, "/login", "/signup"],
      },
      // Claude/Anthropic crawler - AI search
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/about", "/pricing", "/subscription", "/llms.txt"],
        disallow: [...protectedPaths, "/login", "/signup"],
      },
      // Perplexity AI crawler
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/about", "/pricing", "/subscription", "/llms.txt"],
        disallow: [...protectedPaths, "/login", "/signup"],
      },
      // Google AI crawler (Gemini)
      {
        userAgent: "Google-Extended",
        allow: ["/", "/about", "/pricing", "/subscription", "/llms.txt"],
        disallow: [...protectedPaths, "/login", "/signup"],
      },
      // Common AI training bots - allow limited access
      {
        userAgent: "CCBot",
        allow: ["/", "/llms.txt"],
        disallow: [...protectedPaths, "/login", "/signup", "/legal/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
