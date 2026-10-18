/**
 * The 9 theme presets — DATA copied verbatim from Django `products/theme_presets.py`
 * (`THEME_PRESETS`, read 2026-10-18, file mtime 2026-09-01). Source of truth stays in
 * Django; this local copy exists only until `GET /api/v1/store/theme/presets/` ships
 * (M08 §7 `[NEEDS BACKEND]`). Do not edit values here — re-copy from the backend.
 *
 * Hex values are data the merchant's store is painted with, consumed only by the theme
 * layer (`tokens.ts`), never by a component (constitution VII, SC-09.4).
 */
export const STORE_FONTS = [
  "Alexandria",
  "Tajawal",
  "Cairo",
  "Almarai",
  "IBM Plex Sans Arabic",
  "Changa",
  "Reem Kufi",
  "El Messiri",
  "Noto Kufi Arabic",
  "Amiri",
  "Rubik",
] as const;
export type StoreFont = (typeof STORE_FONTS)[number];

export const DESIGN_STYLES = ["fluid", "aurora_glass", "neo_brutalism", "cinematic_silk", "clay_zen"] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

export const PRESET_KEYS = [
  "modern_trust",
  "luxury_boutique",
  "organic_earth",
  "tech_cyber",
  "bold_streetwear",
  "aurora_glass",
  "neo_brutalism",
  "cinematic_silk",
  "clay_zen",
] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

export interface ThemePreset {
  key: PresetKey;
  name: string;
  description: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  card_border_color: string;
  heading_font: StoreFont;
  body_font: StoreFont;
  design_style: DesignStyle;
}

/** `DEFAULT_THEME_KEY` in `theme_presets.py`. */
export const DEFAULT_PRESET: PresetKey = "modern_trust";

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    key: "modern_trust",
    name: "الأساسي",
    description: "إنديجو حديث وموثوق — الاختيار الآمن لأي متجر عام، وهوية شروة الافتراضية.",
    primary_color: "#4F46E5",
    secondary_color: "#1E293B",
    background_color: "#F8FAFC",
    text_color: "#0F172A",
    card_border_color: "#E2E8F0",
    heading_font: "Tajawal",
    body_font: "Tajawal",
    design_style: "fluid",
  },
  {
    key: "luxury_boutique",
    name: "تَرَف",
    description: "ذهبي معدني على أسود فاحم — لمتاجر العطور والمجوهرات والبوتيكات الراقية.",
    primary_color: "#D4AF37",
    secondary_color: "#1A1A1A",
    background_color: "#FAFAFA",
    text_color: "#27272A",
    card_border_color: "#E8DCC0",
    heading_font: "Amiri",
    body_font: "Cairo",
    design_style: "fluid",
  },
  {
    key: "organic_earth",
    name: "طبيعة",
    description: "أخضر زيتي وبيج رملي دافئ — لمتاجر العناية بالبشرة والمنتجات العضوية.",
    primary_color: "#4A5D23",
    secondary_color: "#D4B895",
    background_color: "#F9F6F0",
    text_color: "#3E3E3E",
    card_border_color: "#E6DCC8",
    heading_font: "Almarai",
    body_font: "Almarai",
    design_style: "fluid",
  },
  {
    key: "tech_cyber",
    name: "نيون",
    description: "سيان وبنفسجي نيون على أسود ليلي (Dark Mode) — لمتاجر الإلكترونيات والجيمرز.",
    primary_color: "#00F0FF",
    secondary_color: "#7000FF",
    background_color: "#09090B",
    text_color: "#F4F4F5",
    card_border_color: "#26262E",
    heading_font: "IBM Plex Sans Arabic",
    body_font: "IBM Plex Sans Arabic",
    design_style: "fluid",
  },
  {
    key: "bold_streetwear",
    name: "حيوية",
    description: "برتقالي صارخ وأسود مطلق على أبيض ناصع — للأزياء الشبابية والمنتجات الرياضية.",
    primary_color: "#FF4500",
    secondary_color: "#000000",
    background_color: "#FFFFFF",
    text_color: "#111827",
    card_border_color: "#E5E7EB",
    heading_font: "Rubik",
    body_font: "Rubik",
    design_style: "fluid",
  },
  {
    key: "aurora_glass",
    name: "الزجاج المضيء",
    description: "خلفية داكنة متحركة بتوهجات سيان ووردي نيون، وبطاقات زجاجية شفافة (Glassmorphism).",
    primary_color: "#00F0FF",
    secondary_color: "#FF007A",
    background_color: "#0B0F19",
    text_color: "#F1F5F9",
    card_border_color: "#FFFFFF",
    heading_font: "Alexandria",
    body_font: "Alexandria",
    design_style: "aurora_glass",
  },
  {
    key: "neo_brutalism",
    name: "التمرد العصري",
    description: "أصفر كهربائي وأزرق صارخ، ظلال صلبة بلا تدرج، وحواف سوداء سميكة — Neo-Brutalism خالص.",
    primary_color: "#FFD700",
    secondary_color: "#2563EB",
    background_color: "#F8FAFC",
    text_color: "#000000",
    card_border_color: "#000000",
    heading_font: "Cairo",
    body_font: "Cairo",
    design_style: "neo_brutalism",
  },
  {
    key: "cinematic_silk",
    name: "الحرير السينمائي",
    description: "أسود فاحم كامل وذهبي شمبانيا معدني — فخامة مطلقة بأزرار شبحية وفراغات واسعة.",
    primary_color: "#F3E5AB",
    secondary_color: "#A1A1AA",
    background_color: "#050505",
    text_color: "#E4E4E7",
    card_border_color: "#F3E5AB",
    heading_font: "Amiri",
    body_font: "Tajawal",
    design_style: "cinematic_silk",
  },
  {
    key: "clay_zen",
    name: "الزن العضوي",
    description: "طينة تيراكوتا وأخضر ماتشا على رملي دافئ — زوايا دائرية ضخمة وظلال ترابية ناعمة.",
    primary_color: "#E2725B",
    secondary_color: "#9CAF88",
    background_color: "#FDFBF7",
    text_color: "#44403C",
    card_border_color: "#E2725B",
    heading_font: "Almarai",
    body_font: "Almarai",
    design_style: "clay_zen",
  },
];

export const PRESETS_BY_KEY: Record<PresetKey, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((p) => [p.key, p]),
) as Record<PresetKey, ThemePreset>;

export function isPresetKey(value: string): value is PresetKey {
  return (PRESET_KEYS as readonly string[]).includes(value);
}

export function isStoreFont(value: string): value is StoreFont {
  return (STORE_FONTS as readonly string[]).includes(value);
}

export function isDesignStyle(value: string): value is DesignStyle {
  return (DESIGN_STYLES as readonly string[]).includes(value);
}
