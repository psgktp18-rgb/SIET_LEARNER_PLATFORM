import type { NextConfig } from "next";
import './src/lib/env';

const nextConfig: NextConfig = {
  /* config options here */
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
