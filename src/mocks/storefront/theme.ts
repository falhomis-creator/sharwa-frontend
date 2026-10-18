import { mix } from "@/lib/color";
import type { StoreConfig } from "@/lib/schemas/store-config";
import { PRESETS_BY_KEY, type PresetKey } from "@/features/storefront/theme/presets";

/**
 * Theme fields of a `/api/v1/config/` fixture. `brand_shades` is derived in Django from
 * `primary_color` when the theme is saved (M08 §5); this mock imitates that derivation
 * (white mix for 50–400, the colour itself at 500, black mix for 600–900) so fixtures carry
 * a full ramp. Hex values here are DATA (what Django sends), consumed by the theme layer.
 */
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const TINTS: Array<[string, number]> = [
  ["50", 0.92],
  ["100", 0.82],
  ["200", 0.66],
  ["300", 0.48],
  ["400", 0.26],
];
const SHADES: Array<[string, number]> = [
  ["600", 0.16],
  ["700", 0.32],
  ["800", 0.48],
  ["900", 0.62],
];

export function deriveBrandShades(primary: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, w] of TINTS) out[k] = mix(WHITE, primary, w);
  out["500"] = primary;
  for (const [k, w] of SHADES) out[k] = mix(BLACK, primary, w);
  return out;
}

type ThemeFields = Pick<
  StoreConfig,
  | "primary_color"
  | "secondary_color"
  | "background_color"
  | "text_color"
  | "card_border_color"
  | "heading_font"
  | "body_font"
  | "design_style"
  | "theme_preset"
  | "brand_shades"
>;

/** A preset applied the way Django applies it: its eight fields copied, then the ramp derived. */
export function presetTheme(key: PresetKey): ThemeFields {
  const p = PRESETS_BY_KEY[key];
  return {
    primary_color: p.primary_color,
    secondary_color: p.secondary_color,
    background_color: p.background_color,
    text_color: p.text_color,
    card_border_color: p.card_border_color,
    heading_font: p.heading_font,
    body_font: p.body_font,
    design_style: p.design_style,
    theme_preset: p.key,
    brand_shades: deriveBrandShades(p.primary_color),
  };
}
