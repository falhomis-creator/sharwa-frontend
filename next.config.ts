import type { NextConfig } from "next";
// Validate environment at config load so a missing TENANT_BASE_DOMAIN fails the build early.
import "./src/env";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Django paths end with "/" — let `/api/v1/config/` reach the BFF instead of a 308 to `/api/v1/config`.
  skipTrailingSlashRedirect: true,
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
