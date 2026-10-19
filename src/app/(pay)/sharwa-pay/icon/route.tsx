import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { TOKENS } from "@/lib/tokens";

/** «محفظتي» icons 192/512 + maskable (FR-40.07): «ش» in zinc on the background token — no store colour. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const size = url.searchParams.get("size") === "192" ? 192 : 512;
  const maskable = url.searchParams.get("maskable") === "1";
  const inner = maskable ? size * 0.6 : size * 0.78;
  const arabic = await readFile(join(process.cwd(), "src/assets/fonts/og/cairo-arabic-700.woff"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: TOKENS.foreground.light }}>
        <div style={{ fontFamily: "CairoArabic", fontSize: inner * 0.62, fontWeight: 700, color: TOKENS.background.light, lineHeight: 1 }}>ش</div>
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "CairoArabic", data: arabic, weight: 700, style: "normal" }], headers: { "cache-control": "public, max-age=3600" } },
  );
}
