/**
 * Literal token values needed OUTSIDE CSS (viewport theme-color, OG images, manifest).
 * These mirror `src/app/globals.css` — the single source of truth. Keep both in sync.
 * Components must never import these for styling; use Tailwind semantic classes instead.
 */
export const TOKENS = {
  background: { light: "#f5f7fa", dark: "#0b1224" },
  foreground: { light: "#0f1b33", dark: "#eef2f8" },
  border: { light: "#e8edf3", dark: "#1f2b48" },
  mutedForeground: { light: "#5b6b82", dark: "#9aa7bd" },
  primary: { light: "#0066ff", dark: "#4d8dff" },
  sidebar: { light: "#0f1e45", dark: "#0a1430" },
} as const;
