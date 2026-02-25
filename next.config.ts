import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_TOKEN: process.env.NEXT_PUBLIC_API_TOKEN,
  },
};

export default nextConfig;
