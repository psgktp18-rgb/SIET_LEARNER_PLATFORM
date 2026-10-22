import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // These heavy server-only packages must NOT be bundled by Turbopack.
  // They use native binaries or large WASM files that only work in Node.js.
  serverExternalPackages: [
    "bcrypt",
    "tesseract.js",
    "pdf-parse",
    "mammoth",
    "@prisma/client",
    "prisma",
  ],
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
