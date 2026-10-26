import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { requestIdentity } from "@/features/tenant/request";
import { getStoreConfig } from "@/features/storefront/api/config";
import { buildStoreTheme } from "@/features/storefront/theme/tokens";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";

/**
 * Store app icons, 192/512 and a maskable 512 (M44 §7: generated in Next, no Django row).
 * With a logo: the logo centred on the store's background. Without: the store name's first
 * letter in the store's text colour on its background (M44 §10) — no decoration.
 * Satori needs WOFF/TTF (not WOFF2), so a Cairo 700 WOFF pair is vendored for this route only.
 */
async function fonts() {
  const dir = join(process.cwd(), "src/assets/fonts/og");
  const [arabic, latin] = await Promise.all([readFile(join(dir, "cairo-arabic-700.woff")), readFile(join(dir, "cairo-latin-700.woff"))]);
  return [
    { name: "CairoArabic", data: arabic, weight: 700 as const, style: "normal" as const },
    { name: "CairoLatin", data: latin, weight: 700 as const, style: "normal" as const },
  ];
}

/** Formats Satori can draw; anything else (webp, avif…) falls back to the letter icon. */
const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/svg+xml"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1") return true;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

/**
 * The `<img>` source for the logo, or null for the letter fallback.
 *
 * Satori refuses private addresses (SSRF guard), and in development Django serves media from
 * `http://localhost:8000/media/…` — every icon request answered 500. A logo served by Django
 * itself (same origin as the upstream, or a private host) is therefore read here, server-side,
 * and handed to Satori as a data URL. Only `/media/` paths are fetched, with a timeout, a size
 * cap and an image-type allow-list; a public https logo (CDN) is passed through unchanged.
 */
async function logoSource(logo: string | null | undefined): Promise<string | null> {
  if (!logo) return null;
  if (logo.startsWith("data:")) return logo;
  let url: URL;
  try {
    url = new URL(logo);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const djangoServed = url.origin === new URL(UPSTREAM_ORIGIN).origin || isPrivateHost(url.hostname);
  if (!djangoServed) return url.toString();
  if (!url.pathname.startsWith("/media/")) return null;
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!INLINE_TYPES.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_LOGO_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const size = url.searchParams.get("size") === "192" ? 192 : 512;
  const maskable = url.searchParams.get("maskable") === "1";
  const identity = await requestIdentity();
  const config = await getStoreConfig(identity.store, identity.storeHost);
  const theme = buildStoreTheme(config);
  const letter = [...config.store_name.replace(/^متجر\s+/, "").trim()][0] ?? "ش";
  // Maskable icons keep their content inside the 80% safe zone.
  const inner = maskable ? size * 0.6 : size * 0.78;
  const logo = await logoSource(config.logo);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.meta.background,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img src={logo} alt="" width={inner} height={inner} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ fontFamily: "CairoArabic, CairoLatin", fontSize: inner * 0.62, fontWeight: 700, color: theme.meta.foreground, lineHeight: 1 }}>{letter}</div>
        )}
      </div>
    ),
    { width: size, height: size, fonts: await fonts(), headers: { "cache-control": "public, max-age=3600" } },
  );
}
