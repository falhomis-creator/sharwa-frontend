/**
 * Literal token values needed OUTSIDE CSS (viewport theme-color, OG images, manifest).
 * These mirror `src/app/globals.css` — the single source of truth. Keep both in sync.
 * Components must never import these for styling; use Tailwind semantic classes instead.
 */
export const TOKENS = {
  background: { light: "#fafafa", dark: "#09090b" },
  foreground: { light: "#09090b", dark: "#fafafa" },
  border: { light: "#e4e4e7", dark: "#27272a" },
  mutedForeground: { light: "#71717a", dark: "#a1a1aa" },
} as const;
