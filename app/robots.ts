import { MetadataRoute } from "next";

const baseUrl =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

/**
 * robots.txt for POSTY
 *
 * - Search engines: everything public is crawlable. /_next/ and /static/ are
 *   NOT blocked: crawlers need those scripts, styles and images to render pages.
 * - /login and /signup stay crawlable on purpose: they carry `noindex`, and a
 *   crawler must be able to fetch them to see it.
 * - Private app areas are disallowed (crawl only — indexing is handled by
 *   authentication and per-page metadata).
 * - AI crawlers: public marketing pages + llms.txt, no auth pages.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/app/",
    "/chat/",
    "/history/",
    "/profile/",
    "/settings/",
    "/onboarding/",
    "/checkout/",
    "/api/",
  ];

  const aiCrawlerRule = (userAgent: string) => ({
    userAgent,
    allow: ["/", "/llms.txt"],
    disallow: [...privatePaths, "/login", "/signup"],
  });

  return {
    rules: [
      // Search engines (Googlebot, Bingbot, …) follow this group.
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      aiCrawlerRule("GPTBot"),
      aiCrawlerRule("ClaudeBot"),
      aiCrawlerRule("PerplexityBot"),
      aiCrawlerRule("Google-Extended"),
      {
        userAgent: "CCBot",
        allow: ["/", "/llms.txt"],
        disallow: [...privatePaths, "/login", "/signup", "/legal/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
