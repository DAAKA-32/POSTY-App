import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour Vercel (sans output: "export")
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.licdn.com",
      },
      {
        protocol: "https",
        hostname: "**.linkedin.com",
      },
      {
        // Unsplash - Images libres de droits pour temoignages
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Performance: optimize images for Core Web Vitals (LCP)
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache for images
  },

  // Performance optimizations for Core Web Vitals
  poweredByHeader: false, // Remove X-Powered-By header (security + performance)
  compress: true, // Enable Brotli/Gzip compression
  reactStrictMode: true, // Better development experience

  // Compiler optimizations for smaller bundles
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Experimental features for performance
  experimental: {
    // Optimize CSS loading for better FCP/LCP
    optimizeCss: true,
  },

  // Allow ngrok dev origins (cross-origin HMR)
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
      {
        // Cache static assets aggressively (images, fonts)
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|avif|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache JS/CSS bundles
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Service worker and manifest
        source: "/(sw.js|manifest.json)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  // Redirects for SEO (trailing slashes, www normalization)
  async redirects() {
    return [
      // Remove trailing slashes for consistency
      {
        source: "/:path+/",
        destination: "/:path+",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
