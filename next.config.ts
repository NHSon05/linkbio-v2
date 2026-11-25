import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    // FE-05: 5 MB images (MAX_IMAGE_BYTES) plus multipart overhead.
    serverActions: { bodySizeLimit: "5.1mb" },
  },
  logging: {
    incomingRequests: { ignore: [/^\/auth\/(?:confirm|callback)(?:[/?]|$)/] },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
