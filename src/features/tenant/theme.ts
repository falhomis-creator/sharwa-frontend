import type { CSSProperties } from "react";
import type { StoreConfig } from "@/features/tenant/schemas";

/**
 * The merchant's theme, applied by overriding THE SAME design tokens on the storefront
 * group root and nowhere else (constitution VII). Values arrive from `/api/v1/config/`
 * as data, so no raw colour literal is written in a component.
 *
 * This also pins the surface to the merchant's own palette regardless of the visitor's
 * dark-mode preference — the storefront is "forced light" in the sense the spec means
 * (M47 T052): inline custom properties win over `.dark`, and `color-scheme: light`
 * follows for form controls and scrollbars. A second `next-themes` provider is
 * deliberately NOT nested here; two providers writing the same class on <html> race
 * each other and produce hydration warnings (constitution IV treats those as failures).
 */
export function storeThemeVars(config: StoreConfig): CSSProperties {
  const shades = config.brand_shades ?? {};
  const shade = (key: string, fallback: string) => shades[key] ?? fallback;
  const ground = config.background_color;
  const ink = config.text_color;
  const primary = config.primary_color;

  const vars: Record<string, string> = {
    "color-scheme": "light",
    "--background": ground,
    "--foreground": ink,
    "--card": ground,
    "--card-foreground": ink,
    "--popover": ground,
    "--popover-foreground": ink,
    "--primary": primary,
    "--primary-foreground": ground,
    "--secondary": shade("100", config.secondary_color),
    "--secondary-foreground": ink,
    "--muted": shade("50", ground),
    "--muted-foreground": shade("700", config.secondary_color),
    "--accent": shade("100", config.secondary_color),
    "--accent-foreground": ink,
    "--border": config.card_border_color ?? shade("200", primary),
    "--input": config.card_border_color ?? shade("200", primary),
    "--ring": primary,
  };

  // Full ramp for the storefront sections built in Phase 4 (hero, cards, badges).
  for (const [key, value] of Object.entries(shades)) vars[`--store-${key}`] = value;

  return vars as CSSProperties;
}
