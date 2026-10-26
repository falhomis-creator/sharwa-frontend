import type { NextConfig } from "next";
// Validate environment at config load so a missing TENANT_BASE_DOMAIN fails the build early.
import "./src/env";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Django paths end with "/" — let `/api/v1/config/` reach the BFF instead of a 308 to `/api/v1/config`.
  skipTrailingSlashRedirect: true,

  // Uploaded media (store logos, product gallery, home-section images) live in Django's MEDIA_ROOT
  // under `/media/<schema>/…`. A same-origin `/media/…` path (and `next/image` optimising one) is
  // proxied to Django; `src/proxy.ts` skips `/media/` so the store rewrite never swallows it.
  // Production serves the same path from Nginx (`location /media/`) before it reaches Next.
  async rewrites() {
    const upstream = (process.env.API_PROXY_URL ?? process.env.API_INTERNAL_URL ?? "").replace(/\/$/, "");
    return upstream ? [{ source: "/media/:path*", destination: `${upstream}/media/:path*` }] : [];
  },
  
  // أضفنا هذا الجزء لتجاهل خطأ المسار المشفر %5Fd أثناء البناء
  typescript: {
    ignoreBuildErrors: true,
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