import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    // Names this build's offline copy (public/sw.js), so phones swap in a new deploy.
    OFFLINE_VERSION: new Date().toISOString(),
  },
  experimental: {
    // Turbopack's build cache (restored by Vercel between deploys) can serve an old
    // globals.css with new components. Builds are a little slower without it, but
    // always match the code.
    turbopackFileSystemCacheForBuild: false,
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
