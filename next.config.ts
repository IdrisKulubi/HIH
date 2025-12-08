import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
  },
  serverExternalPackages: ['@neondatabase/serverless'],
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
