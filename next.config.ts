import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off on purpose: almost every page reads the Supabase session cookie, so pages render per request.
  // (With it on, each such page needs `export const instant = false` or the build fails.)
  cacheComponents: false,
  devIndicators: false, // the dev badge covers the bottom tab bar during demos
  turbopack: {
    rules: {
      "*.css": {
        // Not CSS modules: `as: "*.css"` would turn them into global CSS and their imported class names undefined.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
