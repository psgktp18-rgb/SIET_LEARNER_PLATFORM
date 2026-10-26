import type { NextConfig } from "next";

const isDocker = process.env.DOCKER === "true";

const nextConfig: NextConfig = {
  // Use 'standalone' ONLY for Docker/self-hosted deployments.
  // Do NOT set this for Vercel - Vercel manages its own output format.
  ...(isDocker ? { output: "standalone" } : {}),

  // Next.js 16 Cache Components (enables Partial Prerendering)
  cacheComponents: true,
  partialPrefetching: true,

  // These heavy server-only packages must NOT be bundled by Webpack/Turbopack.
  // They use native binaries or large WASM files that only work in Node.js.
  serverExternalPackages: [
    "bcrypt",
    "tesseract.js",
    "pdf-parse",
    "mammoth",
    "@prisma/client",
    "prisma",
  ],

  // Turbopack config (used in dev with `next dev`)
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
