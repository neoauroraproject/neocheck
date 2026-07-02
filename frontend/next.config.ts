import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;
