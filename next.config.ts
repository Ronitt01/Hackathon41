import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off on purpose: almost every page reads the Supabase session cookie, so pages render per request.
  // (With it on, each such page needs `export const instant = false` or the build fails.)
  cacheComponents: false,
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
