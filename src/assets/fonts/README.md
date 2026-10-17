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
