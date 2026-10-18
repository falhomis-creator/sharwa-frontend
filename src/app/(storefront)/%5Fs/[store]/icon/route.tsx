import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { requestIdentity } from "@/features/tenant/request";
import { getStoreConfig } from "@/features/storefront/api/config";
import { buildStoreTheme } from "@/features/storefront/theme/tokens";

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
        {config.logo && /^https?:|^data:/.test(config.logo) ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img src={config.logo} alt="" width={inner} height={inner} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ fontFamily: "CairoArabic, CairoLatin", fontSize: inner * 0.62, fontWeight: 700, color: theme.meta.foreground, lineHeight: 1 }}>{letter}</div>
        )}
      </div>
    ),
    { width: size, height: size, fonts: await fonts(), headers: { "cache-control": "public, max-age=3600" } },
  );
}
