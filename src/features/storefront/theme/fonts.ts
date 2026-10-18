import localFont from "next/font/local";
import type { StoreFont } from "@/features/storefront/theme/presets";

/**
 * The 11 merchant fonts (M08 US-08.2, M09 FR-09.04) — self-hosted Arabic subsets via
 * `next/font/local` (research R-07: `next/font/google` is not usable here), `display: swap`.
 *
 * Lazy by construction: `preload: false` on all ten, so the page only declares their
 * `@font-face` rules and the browser downloads a file only when a rendered element uses
 * that family. The store root names exactly two families (heading + body), so at most two
 * fonts are ever fetched per store (FR-09.04). IBM Plex Sans Arabic is the platform UI font
 * already loaded by the root layout, and every stack ends in it for Latin glyphs, which the
 * Arabic subsets do not carry.
 */

const alexandria = localFont({
  src: [
    { path: "../../../assets/fonts/store/alexandria-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/alexandria-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const tajawal = localFont({
  src: [
    { path: "../../../assets/fonts/store/tajawal-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/tajawal-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const cairo = localFont({
  src: [
    { path: "../../../assets/fonts/store/cairo-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/cairo-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const almarai = localFont({
  src: [
    { path: "../../../assets/fonts/store/almarai-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/almarai-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const changa = localFont({
  src: [
    { path: "../../../assets/fonts/store/changa-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/changa-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const reemKufi = localFont({
  src: [
    { path: "../../../assets/fonts/store/reem-kufi-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/reem-kufi-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const elMessiri = localFont({
  src: [
    { path: "../../../assets/fonts/store/el-messiri-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/el-messiri-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const notoKufiArabic = localFont({
  src: [
    { path: "../../../assets/fonts/store/noto-kufi-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/noto-kufi-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const amiri = localFont({
  src: [
    { path: "../../../assets/fonts/store/amiri-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/amiri-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});
const rubik = localFont({
  src: [
    { path: "../../../assets/fonts/store/rubik-400.woff2", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/store/rubik-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});

const FAMILIES: Record<Exclude<StoreFont, "IBM Plex Sans Arabic">, string> = {
  "Alexandria": alexandria.style.fontFamily,
  "Tajawal": tajawal.style.fontFamily,
  "Cairo": cairo.style.fontFamily,
  "Almarai": almarai.style.fontFamily,
  "Changa": changa.style.fontFamily,
  "Reem Kufi": reemKufi.style.fontFamily,
  "El Messiri": elMessiri.style.fontFamily,
  "Noto Kufi Arabic": notoKufiArabic.style.fontFamily,
  "Amiri": amiri.style.fontFamily,
  "Rubik": rubik.style.fontFamily,
};

/** CSS `font-family` stack for a store font; Latin falls through to IBM Plex Sans Arabic. */
export function storeFontStack(font: StoreFont): string {
  const plex = "var(--font-ibm-plex-arabic), ui-sans-serif, system-ui, sans-serif";
  if (font === "IBM Plex Sans Arabic") return plex;
  return `${FAMILIES[font]}, ${plex}`;
}
