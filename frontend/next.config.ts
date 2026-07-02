import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://localhost:8080/api/:path*'
          : (process.env.BACKEND_URL || 'http://backend:8080/api/:path*'),
      },
    ];
  },
};

export default nextConfig;
