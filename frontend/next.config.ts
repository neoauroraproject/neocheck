import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8081";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
    ];
  },
};

export default nextConfig;
