/**
 * SEO Checklist for POSTY
 * Comprehensive validation checklist for desktop and mobile
 * Use this for pre-launch and ongoing SEO audits
 */

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pass" | "fail" | "warning" | "not-checked";
  notes?: string;
  howToFix?: string;
}

/**
 * Technical SEO Checklist
 */
export const technicalSeoChecklist: ChecklistItem[] = [
  // Indexation & Crawlability
  {
    id: "tech-1",
    category: "Indexation",
    item: "robots.txt exists and is properly configured",
    priority: "critical",
    status: "not-checked",
    howToFix: "Verify /robots.txt allows Googlebot and blocks sensitive paths",
  },
  {
    id: "tech-2",
    category: "Indexation",
    item: "XML sitemap exists and is submitted to GSC",
    priority: "critical",
    status: "not-checked",
    howToFix: "Check /sitemap.xml and submit to Google Search Console",
  },
  {
    id: "tech-3",
    category: "Indexation",
    item: "All important pages are indexable (no noindex)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Check meta robots tags on key pages",
  },
  {
    id: "tech-4",
    category: "Indexation",
    item: "Canonical URLs are properly set",
    priority: "high",
    status: "not-checked",
    howToFix: "Verify rel=canonical on all pages points to correct URL",
  },
  {
    id: "tech-5",
    category: "Indexation",
    item: "No duplicate content issues",
    priority: "high",
    status: "not-checked",
    howToFix: "Check for duplicate pages, use canonical tags",
  },

  // HTTPS & Security
  {
    id: "tech-6",
    category: "Security",
    item: "Site fully served over HTTPS",
    priority: "critical",
    status: "not-checked",
    howToFix: "Ensure all resources load over HTTPS",
  },
  {
    id: "tech-7",
    category: "Security",
    item: "HTTP redirects to HTTPS",
    priority: "critical",
    status: "not-checked",
    howToFix: "Configure 301 redirect from HTTP to HTTPS",
  },
  {
    id: "tech-8",
    category: "Security",
    item: "Security headers configured",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add X-Content-Type-Options, X-Frame-Options, CSP",
  },

  // URL Structure
  {
    id: "tech-9",
    category: "URL Structure",
    item: "URLs are clean and descriptive",
    priority: "high",
    status: "not-checked",
    howToFix: "Use lowercase, hyphens, no special characters",
  },
  {
    id: "tech-10",
    category: "URL Structure",
    item: "No broken links (404s)",
    priority: "high",
    status: "not-checked",
    howToFix: "Run crawl and fix or redirect broken links",
  },
  {
    id: "tech-11",
    category: "URL Structure",
    item: "Custom 404 page exists",
    priority: "medium",
    status: "not-checked",
    howToFix: "Create helpful 404 page with navigation",
  },

  // International SEO
  {
    id: "tech-12",
    category: "International",
    item: "hreflang tags implemented correctly",
    priority: "high",
    status: "not-checked",
    howToFix: "Add hreflang tags for each language version",
  },
  {
    id: "tech-13",
    category: "International",
    item: "x-default hreflang is set",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add x-default for fallback language",
  },
  {
    id: "tech-14",
    category: "International",
    item: "Language selector is crawlable",
    priority: "medium",
    status: "not-checked",
    howToFix: "Ensure language links use proper anchor tags",
  },
];

/**
 * On-Page SEO Checklist
 */
export const onPageSeoChecklist: ChecklistItem[] = [
  // Meta Tags
  {
    id: "onpage-1",
    category: "Meta Tags",
    item: "Unique title tag on each page (50-60 chars)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Each page needs unique, keyword-rich title",
  },
  {
    id: "onpage-2",
    category: "Meta Tags",
    item: "Unique meta description (150-160 chars)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Write compelling descriptions with keywords",
  },
  {
    id: "onpage-3",
    category: "Meta Tags",
    item: "Open Graph tags present",
    priority: "high",
    status: "not-checked",
    howToFix: "Add og:title, og:description, og:image",
  },
  {
    id: "onpage-4",
    category: "Meta Tags",
    item: "Twitter Card tags present",
    priority: "high",
    status: "not-checked",
    howToFix: "Add twitter:card, twitter:title, twitter:image",
  },

  // Headings
  {
    id: "onpage-5",
    category: "Headings",
    item: "Single H1 per page with target keyword",
    priority: "critical",
    status: "not-checked",
    howToFix: "Each page should have exactly one H1",
  },
  {
    id: "onpage-6",
    category: "Headings",
    item: "Heading hierarchy is logical (H1 > H2 > H3)",
    priority: "high",
    status: "not-checked",
    howToFix: "Don't skip heading levels",
  },
  {
    id: "onpage-7",
    category: "Headings",
    item: "Headings contain relevant keywords",
    priority: "medium",
    status: "not-checked",
    howToFix: "Include keywords naturally in headings",
  },

  // Content
  {
    id: "onpage-8",
    category: "Content",
    item: "Content is unique and valuable",
    priority: "critical",
    status: "not-checked",
    howToFix: "No duplicate or thin content",
  },
  {
    id: "onpage-9",
    category: "Content",
    item: "Target keywords used naturally",
    priority: "high",
    status: "not-checked",
    howToFix: "Include keywords without stuffing",
  },
  {
    id: "onpage-10",
    category: "Content",
    item: "Internal linking structure",
    priority: "high",
    status: "not-checked",
    howToFix: "Link to related pages with descriptive anchors",
  },

  // Images
  {
    id: "onpage-11",
    category: "Images",
    item: "All images have alt text",
    priority: "high",
    status: "not-checked",
    howToFix: "Add descriptive alt attributes to images",
  },
  {
    id: "onpage-12",
    category: "Images",
    item: "Images are optimized (WebP/AVIF)",
    priority: "high",
    status: "not-checked",
    howToFix: "Use next/image for automatic optimization",
  },
  {
    id: "onpage-13",
    category: "Images",
    item: "Images have proper dimensions set",
    priority: "medium",
    status: "not-checked",
    howToFix: "Set width/height to prevent CLS",
  },
];

/**
 * Core Web Vitals Checklist
 */
export const coreWebVitalsChecklist: ChecklistItem[] = [
  // LCP (Largest Contentful Paint)
  {
    id: "cwv-1",
    category: "LCP",
    item: "LCP under 2.5 seconds (desktop)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Optimize images, fonts, critical CSS",
  },
  {
    id: "cwv-2",
    category: "LCP",
    item: "LCP under 2.5 seconds (mobile)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Reduce payload, optimize for 3G",
  },
  {
    id: "cwv-3",
    category: "LCP",
    item: "Critical resources preloaded",
    priority: "high",
    status: "not-checked",
    howToFix: "Preload fonts, hero images, critical JS",
  },
  {
    id: "cwv-4",
    category: "LCP",
    item: "Server response time under 200ms",
    priority: "high",
    status: "not-checked",
    howToFix: "Use CDN, edge functions, caching",
  },

  // INP (Interaction to Next Paint)
  {
    id: "cwv-5",
    category: "INP",
    item: "INP under 200ms",
    priority: "critical",
    status: "not-checked",
    howToFix: "Optimize JavaScript, reduce main thread work",
  },
  {
    id: "cwv-6",
    category: "INP",
    item: "No long tasks blocking main thread",
    priority: "high",
    status: "not-checked",
    howToFix: "Break up long tasks, use web workers",
  },
  {
    id: "cwv-7",
    category: "INP",
    item: "Event handlers are optimized",
    priority: "medium",
    status: "not-checked",
    howToFix: "Debounce inputs, use passive event listeners",
  },

  // CLS (Cumulative Layout Shift)
  {
    id: "cwv-8",
    category: "CLS",
    item: "CLS under 0.1",
    priority: "critical",
    status: "not-checked",
    howToFix: "Set dimensions on images/videos, reserve space",
  },
  {
    id: "cwv-9",
    category: "CLS",
    item: "Fonts don't cause layout shift",
    priority: "high",
    status: "not-checked",
    howToFix: "Use font-display: swap, preload fonts",
  },
  {
    id: "cwv-10",
    category: "CLS",
    item: "No dynamically injected content above fold",
    priority: "high",
    status: "not-checked",
    howToFix: "Reserve space for ads, embeds, lazy content",
  },

  // General Performance
  {
    id: "cwv-11",
    category: "Performance",
    item: "JavaScript bundle size optimized",
    priority: "high",
    status: "not-checked",
    howToFix: "Code splitting, tree shaking, lazy loading",
  },
  {
    id: "cwv-12",
    category: "Performance",
    item: "CSS is not render-blocking",
    priority: "high",
    status: "not-checked",
    howToFix: "Critical CSS inline, defer non-critical",
  },
  {
    id: "cwv-13",
    category: "Performance",
    item: "Third-party scripts don't block rendering",
    priority: "medium",
    status: "not-checked",
    howToFix: "Load analytics async, defer non-essential",
  },
];

/**
 * Mobile SEO Checklist
 */
export const mobileSeoChecklist: ChecklistItem[] = [
  {
    id: "mobile-1",
    category: "Mobile Usability",
    item: "Site is mobile-friendly (responsive)",
    priority: "critical",
    status: "not-checked",
    howToFix: "Use responsive design, test on multiple devices",
  },
  {
    id: "mobile-2",
    category: "Mobile Usability",
    item: "Viewport meta tag is set correctly",
    priority: "critical",
    status: "not-checked",
    howToFix: "Add width=device-width, initial-scale=1",
  },
  {
    id: "mobile-3",
    category: "Mobile Usability",
    item: "Touch targets are at least 48x48px",
    priority: "high",
    status: "not-checked",
    howToFix: "Increase button/link sizes for touch",
  },
  {
    id: "mobile-4",
    category: "Mobile Usability",
    item: "Font size is at least 16px",
    priority: "high",
    status: "not-checked",
    howToFix: "Use base font-size of 16px minimum",
  },
  {
    id: "mobile-5",
    category: "Mobile Usability",
    item: "No horizontal scrolling",
    priority: "high",
    status: "not-checked",
    howToFix: "Ensure content fits viewport width",
  },
  {
    id: "mobile-6",
    category: "Mobile Usability",
    item: "Content is not hidden behind interstitials",
    priority: "medium",
    status: "not-checked",
    howToFix: "Avoid intrusive pop-ups on mobile",
  },
  {
    id: "mobile-7",
    category: "Mobile Usability",
    item: "Forms are mobile-optimized",
    priority: "medium",
    status: "not-checked",
    howToFix: "Use proper input types, autocomplete",
  },
];

/**
 * Structured Data Checklist
 */
export const structuredDataChecklist: ChecklistItem[] = [
  {
    id: "sd-1",
    category: "Schema.org",
    item: "Organization schema present",
    priority: "high",
    status: "not-checked",
    howToFix: "Add Organization JSON-LD to homepage",
  },
  {
    id: "sd-2",
    category: "Schema.org",
    item: "WebSite schema present",
    priority: "high",
    status: "not-checked",
    howToFix: "Add WebSite JSON-LD for sitelinks search",
  },
  {
    id: "sd-3",
    category: "Schema.org",
    item: "SoftwareApplication schema present",
    priority: "high",
    status: "not-checked",
    howToFix: "Add SoftwareApplication for app listings",
  },
  {
    id: "sd-4",
    category: "Schema.org",
    item: "FAQ schema on relevant pages",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add FAQPage JSON-LD with Q&A",
  },
  {
    id: "sd-5",
    category: "Schema.org",
    item: "HowTo schema for tutorials",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add HowTo JSON-LD for step-by-step content",
  },
  {
    id: "sd-6",
    category: "Schema.org",
    item: "Product/Offer schema on pricing page",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add Product schema with pricing info",
  },
  {
    id: "sd-7",
    category: "Schema.org",
    item: "BreadcrumbList for navigation",
    priority: "low",
    status: "not-checked",
    howToFix: "Add breadcrumb schema for subpages",
  },
  {
    id: "sd-8",
    category: "Validation",
    item: "All structured data passes Google validation",
    priority: "critical",
    status: "not-checked",
    howToFix: "Test at search.google.com/test/rich-results",
  },
];

/**
 * Off-Page SEO Checklist
 */
export const offPageSeoChecklist: ChecklistItem[] = [
  {
    id: "offpage-1",
    category: "Backlinks",
    item: "Competitor backlink analysis done",
    priority: "high",
    status: "not-checked",
    howToFix: "Use Ahrefs/SEMrush to analyze competitor links",
  },
  {
    id: "offpage-2",
    category: "Backlinks",
    item: "Listed in relevant directories",
    priority: "medium",
    status: "not-checked",
    howToFix: "Submit to G2, Capterra, Product Hunt, etc.",
  },
  {
    id: "offpage-3",
    category: "Backlinks",
    item: "Guest posting strategy in place",
    priority: "medium",
    status: "not-checked",
    howToFix: "Identify target blogs, pitch guest posts",
  },
  {
    id: "offpage-4",
    category: "Brand",
    item: "Google Business Profile set up (if applicable)",
    priority: "low",
    status: "not-checked",
    howToFix: "Claim and optimize GBP listing",
  },
  {
    id: "offpage-5",
    category: "Brand",
    item: "Social profiles link to website",
    priority: "medium",
    status: "not-checked",
    howToFix: "Add website links to all social profiles",
  },
  {
    id: "offpage-6",
    category: "Brand",
    item: "Brand mentions are being claimed",
    priority: "low",
    status: "not-checked",
    howToFix: "Monitor mentions, request links from unlinked",
  },
];

/**
 * Analytics & Tracking Checklist
 */
export const analyticsChecklist: ChecklistItem[] = [
  {
    id: "analytics-1",
    category: "Setup",
    item: "Google Search Console verified",
    priority: "critical",
    status: "not-checked",
    howToFix: "Verify site ownership in GSC",
  },
  {
    id: "analytics-2",
    category: "Setup",
    item: "Google Analytics 4 installed",
    priority: "critical",
    status: "not-checked",
    howToFix: "Add GA4 tracking code to all pages",
  },
  {
    id: "analytics-3",
    category: "Setup",
    item: "Sitemap submitted to GSC",
    priority: "high",
    status: "not-checked",
    howToFix: "Submit sitemap.xml in Search Console",
  },
  {
    id: "analytics-4",
    category: "Setup",
    item: "Core Web Vitals being tracked",
    priority: "high",
    status: "not-checked",
    howToFix: "Check CWV report in GSC",
  },
  {
    id: "analytics-5",
    category: "Setup",
    item: "Conversion tracking configured",
    priority: "high",
    status: "not-checked",
    howToFix: "Set up goals/conversions in GA4",
  },
  {
    id: "analytics-6",
    category: "Monitoring",
    item: "404 errors being monitored",
    priority: "medium",
    status: "not-checked",
    howToFix: "Check Coverage report in GSC regularly",
  },
  {
    id: "analytics-7",
    category: "Monitoring",
    item: "Rankings being tracked",
    priority: "medium",
    status: "not-checked",
    howToFix: "Use GSC or third-party rank tracker",
  },
];

/**
 * Pre-Launch SEO Checklist Summary
 */
export const preLaunchChecklist = {
  critical: [
    "HTTPS enabled with proper redirects",
    "Robots.txt allows indexing of key pages",
    "Sitemap.xml submitted to Google",
    "All pages have unique titles and descriptions",
    "Single H1 per page with target keyword",
    "Google Search Console verified",
    "Core Web Vitals in green zone",
    "Mobile-friendly design verified",
    "Structured data validates without errors",
  ],
  highPriority: [
    "Canonical URLs set correctly",
    "hreflang tags for multilingual content",
    "Open Graph and Twitter cards present",
    "Images optimized with alt text",
    "Internal linking structure in place",
    "Analytics tracking configured",
    "Custom 404 page exists",
  ],
  postLaunch: [
    "Monitor GSC for crawl errors",
    "Check indexation status daily for first week",
    "Track Core Web Vitals in real user data",
    "Begin backlink acquisition strategy",
    "Submit to relevant directories",
    "Monitor brand mentions",
  ],
};

/**
 * SEO Audit Tools
 */
export const seoAuditTools = {
  free: [
    {
      name: "Google Search Console",
      url: "https://search.google.com/search-console",
      purpose: "Indexation, errors, performance, CWV",
    },
    {
      name: "Google PageSpeed Insights",
      url: "https://pagespeed.web.dev",
      purpose: "Core Web Vitals, performance audit",
    },
    {
      name: "Google Rich Results Test",
      url: "https://search.google.com/test/rich-results",
      purpose: "Structured data validation",
    },
    {
      name: "Google Mobile-Friendly Test",
      url: "https://search.google.com/test/mobile-friendly",
      purpose: "Mobile usability check",
    },
    {
      name: "Lighthouse",
      url: "Built into Chrome DevTools",
      purpose: "Performance, SEO, accessibility audit",
    },
  ],
  paid: [
    {
      name: "Ahrefs",
      url: "https://ahrefs.com",
      purpose: "Backlinks, keywords, competitor analysis",
    },
    {
      name: "SEMrush",
      url: "https://semrush.com",
      purpose: "Complete SEO toolkit",
    },
    {
      name: "Screaming Frog",
      url: "https://screamingfrog.co.uk",
      purpose: "Technical SEO crawler",
    },
  ],
};

export default {
  technicalSeoChecklist,
  onPageSeoChecklist,
  coreWebVitalsChecklist,
  mobileSeoChecklist,
  structuredDataChecklist,
  offPageSeoChecklist,
  analyticsChecklist,
  preLaunchChecklist,
  seoAuditTools,
};
