import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour Vercel (sans output: "export")
  // Les images sont optimisées par défaut sur Vercel
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
    ],
  },
};

export default nextConfig;
