import { ImageResponse } from "next/og";
import { seo } from "@/features/landing/landing.content";
import { TOKENS } from "@/lib/tokens";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "شروه — منصة تجارة إلكترونية عربية";

/**
 * T043 — flat zinc-50 ground, zinc-950 text, one hairline rule. No gradient.
 *
 * Satori renders outside the browser, so CSS custom properties do not resolve;
 * values come from `src/lib/tokens.ts`, the sanctioned non-CSS mirror of
 * globals.css (constitution VII).
 *
 * Satori cannot read WOFF2, so the self-hosted faces in `src/assets/fonts`
 * are unusable here; the TTF is pulled from Google Fonts at build time and the
 * card degrades to the platform sans if the network is unavailable.
 */
async function arabicFont(weight: 400 | 600): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@${weight}`,
      { headers: { "user-agent": "Mozilla/5.0" } },
    ).then((r) => r.text());
    const url = /src:\s*url\((https:\/\/[^)]+\.(?:ttf|otf))\)/.exec(css)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [regular, semibold] = await Promise.all([arabicFont(400), arabicFont(600)]);
  const fonts = [
    regular && { name: "Plex", data: regular, weight: 400 as const, style: "normal" as const },
    semibold && { name: "Plex", data: semibold, weight: 600 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: TOKENS.background.light,
          color: TOKENS.foreground.light,
          padding: "72px",
          fontFamily: fonts.length ? "Plex" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>شروه</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 600, lineHeight: 1.2 }}>
            متجر إلكتروني كامل بالعربية
          </div>
          <div style={{ display: "flex", width: "100%", height: 1, background: TOKENS.border.light }} />
          <div style={{ display: "flex", fontSize: 30, color: TOKENS.mutedForeground.light, lineHeight: 1.4 }}>
            {seo.description}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
