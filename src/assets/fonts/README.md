# Vendored fonts

Self-hosted via `next/font/local` (constitution II/IX: IBM Plex Sans Arabic for UI text, Geist Mono for numbers/prices/SKUs, `display: swap`).

| File | Family | Weights | Source |
|---|---|---|---|
| `ibm-plex-sans-arabic-400.woff2` | IBM Plex Sans Arabic | 400 | Google Fonts (full charset build) |
| `ibm-plex-sans-arabic-500.woff2` | IBM Plex Sans Arabic | 500 | Google Fonts (full charset build) |
| `ibm-plex-sans-arabic-600.woff2` | IBM Plex Sans Arabic | 600 | Google Fonts (full charset build) |
| `geist-mono-400.woff2` / `-500` / `-600` | Geist Mono | 400 · 500 · 600 | Google Fonts (full charset build) |

Both families are licensed under the SIL Open Font License 1.1 (IBM Plex © IBM Corp.; Geist © Vercel Inc.).

Why vendored instead of `next/font/google`: in `next dev` the Google loader applies a hard 3 s timeout per font file; with 18 subset files fetched concurrently from this network it timed out and the layout failed to compile (`Module not found: @vercel/turbopack-next/internal/font/google/font`). Vendoring makes dev and CI deterministic and offline-capable. See `specs/001-sharwa-frontend-platform/research.md` R-07.

## Store fonts (Phase 4 · M09 T088)

`store/*.woff2` — the ten merchant-selectable families of `STORE_FONTS`
(`src/features/storefront/theme/presets.ts`, the Django `theme_presets.py` list), each at
400 and 700, **Arabic subset**, declared in `src/features/storefront/theme/fonts.ts` with
`preload: false` so a store fetches only the one or two families its theme names (SC-09.4).
The eleventh option, IBM Plex Sans Arabic, is the platform face above.

| Files | Family | Licence |
|---|---|---|
| `alexandria-{400,700}` | Alexandria | OFL 1.1 |
| `tajawal-{400,700}` | Tajawal | OFL 1.1 |
| `cairo-{400,700}` | Cairo | OFL 1.1 |
| `almarai-{400,700}` | Almarai | OFL 1.1 |
| `changa-{400,700}` | Changa | OFL 1.1 |
| `reem-kufi-{400,700}` | Reem Kufi | OFL 1.1 |
| `el-messiri-{400,700}` | El Messiri | OFL 1.1 |
| `noto-kufi-arabic-{400,700}` | Noto Kufi Arabic | OFL 1.1 |
| `amiri-{400,700}` | Amiri | OFL 1.1 |
| `rubik-{400,700}` | Rubik | OFL 1.1 |

Source: the Fontsource packages (`@fontsource/<family>`, `arabic` subset), which repackage
the Google Fonts builds. Same reason as above for not using `next/font/google`.

`og/cairo-{arabic,latin}-700.woff` — WOFF (not WOFF2: Satori cannot read WOFF2) for the
generated PWA icons in `src/app/(storefront)/%5Fs/[store]/icon/route.tsx`. Registered as two
families (`CairoArabic`, `CairoLatin`) so Satori falls back per glyph. Cairo, OFL 1.1.
