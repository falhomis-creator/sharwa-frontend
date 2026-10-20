import { contrast, ensureContrast, isDark, isHex, mix } from "@/lib/color";
import type { StoreConfig } from "@/features/storefront/schemas/config";
import {
  DEFAULT_PRESET,
  isDesignStyle,
  isPresetKey,
  isStoreFont,
  type DesignStyle,
  type StoreFont,
} from "@/features/storefront/theme/presets";

/**
 * Merchant theme → design tokens (T088, M09 US-09.2, constitution VII).
 *
 * This file and `apply-theme.tsx` are the ONLY places on the storefront where raw colour
 * values exist (SC-09.4). Everything here is derived from the merchant's `/config/` data;
 * the few literals below are the zinc fallback and the two button-ink candidates the spec
 * names (`#09090B` / `#FAFAFA`, US-09.2.4). Components consume the result only through the
 * same semantic Tailwind classes the rest of the app uses (`bg-primary`, `border-border`…).
 *
 * Every preset, including `aurora_glass` and `neo_brutalism`, is interpreted as a flat token
 * map — radius, border width, density, button style — with no gradient, glow or shadow
 * (constitution I; M09 §10 assumption).
 */
const INK_DARK = "#09090B";
const INK_LIGHT = "#FAFAFA";

/** Zinc ramp — the documented fallback when the merchant's ramp is missing (M09 §8). */
const ZINC_RAMP: Record<string, string> = {
  "50": "#FAFAFA",
  "100": "#F4F4F5",
  "200": "#E4E4E7",
  "300": "#D4D4D8",
  "400": "#A1A1AA",
  "500": "#71717A",
  "600": "#52525B",
  "700": "#3F3F46",
  "800": "#27272A",
  "900": "#18181B",
};
const ZINC = { primary: "#18181B", secondary: "#3F3F46", background: "#FFFFFF", text: INK_DARK, border: "#E4E4E7" };
/** Elevation tint for `shadow-card` on the storefront: the merchant ink at low alpha, set below. */
const SHADOW_ALPHA = { card: [0.04, 0.08], hover: [0.05, 0.14] } as const;

const RAMP_KEYS = Object.keys(ZINC_RAMP);

/** Semantic text colours (constitution: emerald-600 · amber-600 · red-600 · sky-600, or their -400 on dark grounds). */
const SEMANTIC = {
  light: { success: "#059669", warning: "#D97706", destructive: "#DC2626", info: "#0284C7" },
  dark: { success: "#34D399", warning: "#FBBF24", destructive: "#F87171", info: "#38BDF8" },
};

/** Flat interpretation of `design_style` (M09 US-09.2.3). */
const STYLE_TOKENS: Record<DesignStyle, { radius: string; border: string; density: "compact" | "regular" | "roomy" }> = {
  fluid: { radius: "0.75rem", border: "1px", density: "regular" },
  aurora_glass: { radius: "1rem", border: "1px", density: "regular" },
  neo_brutalism: { radius: "0rem", border: "2px", density: "compact" },
  cinematic_silk: { radius: "0.25rem", border: "1px", density: "roomy" },
  clay_zen: { radius: "1.5rem", border: "1px", density: "roomy" },
};

export interface StoreTheme {
  vars: Record<string, string>;
  preset: string;
  style: DesignStyle;
  density: "compact" | "regular" | "roomy";
  headingFont: StoreFont;
  bodyFont: StoreFont;
  scheme: "light" | "dark";
  /** Hex values outside CSS (manifest `theme_color`, OG image) — data, not styling. */
  meta: { background: string; primary: string; foreground: string };
}

/** `#RRGGBB` → `rgb(r g b / a)` — the merchant ink as a translucent shadow colour. */
function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
}

function inkOn(bg: string): string {
  return contrast(INK_DARK, bg) >= contrast(INK_LIGHT, bg) ? INK_DARK : INK_LIGHT;
}

function warn(message: string) {
  if (process.env.NODE_ENV !== "production") console.warn(`[storefront theme] ${message}`);
}

export function resolveFont(name: string | null | undefined): StoreFont {
  if (name && isStoreFont(name)) return name;
  if (name) warn(`font «${name}» is not one of the 11 allowed — falling back to IBM Plex Sans Arabic`);
  return "IBM Plex Sans Arabic";
}

export function buildStoreTheme(config: StoreConfig): StoreTheme {
  const valid = isHex(config.primary_color);
  if (!valid) warn(`primary_color «${config.primary_color}» is not a colour — using zinc`);

  const background = isHex(config.background_color) ? config.background_color : ZINC.background;
  const foreground = isHex(config.text_color) ? config.text_color : ZINC.text;
  const primary = valid ? config.primary_color : ZINC.primary;
  const secondary = valid && isHex(config.secondary_color) ? config.secondary_color : ZINC.secondary;

  const shades = config.brand_shades ?? {};
  const rampComplete = RAMP_KEYS.every((k) => isHex(shades[k]));
  if (valid && !rampComplete) warn("brand_shades incomplete — the ramp falls back to zinc");
  const ramp = valid && rampComplete ? shades : ZINC_RAMP;

  const style: DesignStyle = isDesignStyle(config.design_style) ? config.design_style : "fluid";
  const preset = isPresetKey(config.theme_preset) ? config.theme_preset : config.theme_preset === "custom" ? "custom" : DEFAULT_PRESET;
  const dark = isDark(background);
  const tokens = STYLE_TOKENS[style];

  const rawBorder = isHex(config.card_border_color) ? config.card_border_color! : mix(foreground, background, 0.12);
  // A white (or black) border on a ground of the opposite lightness reads as a frame, not a hairline:
  // aurora_glass ships `#FFFFFF` on `#0B0F19`. Flatten it to a translucent-looking hairline.
  const border = contrast(rawBorder, background) > 6 ? mix(rawBorder, background, style === "neo_brutalism" ? 1 : 0.2) : rawBorder;
  const muted = mix(foreground, background, dark ? 0.08 : 0.045);
  const semantic = dark ? SEMANTIC.dark : SEMANTIC.light;

  const vars: Record<string, string> = {
    "--background": background,
    "--foreground": foreground,
    // Cards lift off the merchant ground (UI/UX Polish): pure white on a light store, a step
    // lighter than the ground on a dark one. Text stays the merchant ink either way.
    "--card": dark ? mix(foreground, background, 0.05) : "#FFFFFF",
    "--card-foreground": foreground,
    "--popover": dark ? mix(foreground, background, 0.05) : "#FFFFFF",
    "--popover-foreground": foreground,
    "--primary": primary,
    "--primary-foreground": inkOn(primary),
    "--secondary": secondary,
    "--secondary-foreground": inkOn(secondary),
    "--muted": muted,
    // Merchant grounds are respected; the SECONDARY text is lifted to AA automatically (M09 §8) —
    // against `--muted`, the stricter of the two surfaces it sits on (image tiles, table heads).
    "--muted-foreground": ensureContrast(mix(foreground, background, 0.62), muted, foreground),
    "--accent": mix(primary, background, 0.1),
    "--accent-foreground": ensureContrast(foreground, mix(primary, background, 0.1), inkOn(background)),
    "--border": border,
    "--input": border,
    "--ring": primary,
    // UI/UX Polish Phase tokens (globals.css). `:root` derives them from the Sharwa brand layer,
    // so the store root MUST set them from the merchant palette or the storefront would show
    // the Sharwa accent: `bg-cta` is the merchant primary, `text-accent-ink` the AA-lifted primary.
    "--cta": primary,
    "--cta-foreground": inkOn(primary),
    "--accent-ink": ensureContrast(primary, background, foreground),
    "--elevation-card": `0 1px 2px 0 ${alpha(foreground, SHADOW_ALPHA.card[0])}, 0 4px 14px -4px ${alpha(foreground, SHADOW_ALPHA.card[1])}`,
    "--elevation-card-hover": `0 2px 4px 0 ${alpha(foreground, SHADOW_ALPHA.hover[0])}, 0 12px 28px -8px ${alpha(foreground, SHADOW_ALPHA.hover[1])}`,
    // Brand colour used AS TEXT (links, «عرض الكل») — gold on white is 2:1, so it is lifted to AA.
    "--store-link": ensureContrast(primary, background, foreground),
    "--success": ensureContrast(semantic.success, background, foreground),
    "--warning": ensureContrast(semantic.warning, background, foreground),
    "--destructive": ensureContrast(semantic.destructive, background, foreground),
    "--info": ensureContrast(semantic.info, background, foreground),
    "--radius": tokens.radius,
    "--store-bw": tokens.border,
  };
  for (const key of RAMP_KEYS) vars[`--brand-${key}`] = ramp[key]!;

  return {
    vars,
    preset,
    style,
    density: tokens.density,
    headingFont: resolveFont(config.heading_font),
    bodyFont: resolveFont(config.body_font),
    scheme: dark ? "dark" : "light",
    meta: { background, primary, foreground },
  };
}
