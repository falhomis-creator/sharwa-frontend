import { TOKENS } from "@/lib/tokens";

/**
 * «محفظة شروة» Web App Manifest (M40 FR-40.07, T182). Served at `/sharwa-pay/manifest.webmanifest`
 * — its own file, not the storefront's per-store manifest. Scope is `/sharwa-pay/` (not `/`
 * as FR-40.07 wrote it): on the platform origin `/` is the marketing site, and an installed
 * wallet must not capture it (Phase 7 deviation, recorded in execution_log).
 */
export function GET() {
  const manifest = {
    name: "محفظة شروة",
    short_name: "محفظتي",
    description: "محفظة مسبقة الدفع واحدة لكل متاجر شروة.",
    id: "/sharwa-pay/",
    start_url: "/sharwa-pay/",
    scope: "/sharwa-pay/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: TOKENS.background.light,
    theme_color: TOKENS.background.light,
    icons: [
      { src: "/sharwa-pay/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/sharwa-pay/icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/sharwa-pay/icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "no-cache" } });
}
