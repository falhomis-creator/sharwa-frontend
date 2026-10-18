import { z } from "zod";
import { SCROLL_SPEEDS } from "@/features/settings/schemas";
import { DESIGN_STYLES, PRESET_KEYS, STORE_FONTS, type DesignStyle, type PresetKey } from "@/features/storefront/theme/presets";
import { sectionTypeSchema, type SectionType } from "@/lib/schemas/store-config";

/**
 * M08 — مخصِّص ثيم المتجر. Contracts of M08 §5/§7: the theme entity (`[NEEDS BACKEND]`
 * `PATCH /api/v1/store/theme/`), the presets row, the announcement fields and the Ready
 * `admin/sections` rows. Enum VALUES verbatim from Django; labels in Arabic.
 */
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const COLOR_TOKENS = ["primary_color", "secondary_color", "background_color", "text_color", "card_border_color"] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];
export const COLOR_LABELS: Record<ColorToken, string> = {
  primary_color: "اللون الأساسي",
  secondary_color: "اللون الثانوي",
  background_color: "الخلفية",
  text_color: "النص",
  card_border_color: "حدود البطاقات",
};

export const DESIGN_STYLE_LABELS: Record<DesignStyle, string> = {
  fluid: "انسيابي",
  aurora_glass: "الزجاج المضيء",
  neo_brutalism: "التمرد العصري",
  cinematic_silk: "الحرير السينمائي",
  clay_zen: "الزن العضوي",
};

export const SINGLETON_TYPES = ["hero", "category_strip", "featured_products", "latest_products", "promotional_offers"] as const;
export const ADDABLE_TYPES = ["slider", "banner_grid", "product_grid"] as const;
export type AddableType = (typeof ADDABLE_TYPES)[number];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "البانر الرئيسي",
  category_strip: "شريط تصفّح الأقسام",
  featured_products: "المنتجات المميزة",
  latest_products: "أحدث المنتجات",
  promotional_offers: "العروض",
  slider: "سلايدر",
  banner_grid: "شبكة بنرات",
  product_grid: "شبكة منتجات حسب تصنيف",
};

export function isSingleton(type: SectionType): boolean {
  return (SINGLETON_TYPES as readonly string[]).includes(type);
}

export const LOGO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;
export const ALLOWED_FORMATS_MESSAGE = `الصيغ المسموحة: ${LOGO_EXTENSIONS.join(", ")}`;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// ── Server rows ────────────────────────────────────────────────────────────────────
export const themeSchema = z.object({
  theme_preset: z.string(),
  primary_color: z.string(),
  secondary_color: z.string(),
  background_color: z.string(),
  text_color: z.string(),
  card_border_color: z.string(),
  heading_font: z.string(),
  body_font: z.string(),
  design_style: z.string(),
  theme_choice: z.string().optional().default("default"),
  logo: z.string().nullable(),
  brand_shades: z.record(z.string(), z.string()).optional().default({}),
  version: z.number().int(),
  updated_at: z.string(),
});
export type ThemeEntity = z.infer<typeof themeSchema>;

export const presetSchema = z.object({
  code: z.enum(PRESET_KEYS),
  name: z.string(),
  description: z.string(),
  tokens: z.object({
    primary_color: z.string(),
    secondary_color: z.string(),
    background_color: z.string(),
    text_color: z.string(),
    card_border_color: z.string(),
  }),
  heading_font: z.enum(STORE_FONTS),
  body_font: z.enum(STORE_FONTS),
  design_style: z.enum(DESIGN_STYLES),
});
export type Preset = z.infer<typeof presetSchema>;
export const presetListSchema = z.array(presetSchema);

export const announcementSchema = z.object({
  enable_announcement_bar: z.boolean(),
  announcement_text: z.string(),
  announcement_bg_color: z.string(),
  announcement_text_color: z.string(),
  announcement_scroll_speed: z.enum(SCROLL_SPEEDS),
  show_banner_on_home: z.boolean(),
  show_banner_on_products: z.boolean(),
  show_banner_on_product_detail: z.boolean(),
  show_banner_on_checkout: z.boolean(),
});
export type Announcement = z.infer<typeof announcementSchema>;

export const sectionItemSchema = z.object({
  image: z.string().nullable().optional().default(null),
  title: z.string().nullable().optional().default(""),
  link: z.string().nullable().optional().default(""),
});
export type SectionItem = z.infer<typeof sectionItemSchema>;

export const adminSectionSchema = z.object({
  id: z.number().int(),
  section_type: sectionTypeSchema,
  label: z.string().optional().default(""),
  order: z.number().int(),
  is_active: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  content_data: z.record(z.string(), z.unknown()).optional().default({}),
});
export type AdminSection = z.infer<typeof adminSectionSchema>;
export const adminSectionListSchema = z.array(adminSectionSchema);
export const reorderResultSchema = z.object({ ok: z.boolean(), reordered: z.number().int() });

export const designCategorySchema = z.object({ id: z.number().int(), name: z.string(), parent_id: z.number().int().nullable() });
export const designCategoryListSchema = z.array(designCategorySchema);
export type DesignCategory = z.infer<typeof designCategorySchema>;

// ── Draft (local only — FR-08.01) ───────────────────────────────────────────────────
export interface ThemeDraft {
  theme_preset: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  card_border_color: string;
  heading_font: string;
  body_font: string;
  design_style: string;
}

/** A draft section: `id < 0` is a new, not yet created row. */
export interface DraftSection {
  id: number;
  section_type: SectionType;
  label: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  content_data: Record<string, unknown>;
}

export type DraftStatus = "clean" | "dirty" | "publishing" | "conflict";
export type PanelTab = "identity" | "sections" | "announcement";
export const PANEL_TABS = ["identity", "sections", "announcement"] as const;
export const PANEL_TAB_LABELS: Record<PanelTab, string> = { identity: "الهوية", sections: "الأقسام", announcement: "شريط الإعلانات" };
export const DEVICES = ["desktop", "mobile"] as const;
export type Device = (typeof DEVICES)[number];
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, mobile: 390 };

export function presetKeyOf(value: string): PresetKey | "custom" {
  return (PRESET_KEYS as readonly string[]).includes(value) ? (value as PresetKey) : "custom";
}

// ── Per-type content validation (FR-08.06: the same shape the server checks) ──────────
const link = z
  .string()
  .trim()
  .refine((v) => v === "" || /^(\/|https?:\/\/)/.test(v), "الرابط يبدأ بـ / أو https://");
const limit = z.coerce.number({ error: "أدخل رقماً." }).int("أدخل رقماً صحيحاً.").min(1, "العدد من 1 إلى 50.").max(50, "العدد من 1 إلى 50.");

export const itemsContentSchema = z.object({
  items: z
    .array(
      z
        .object({ image: z.string().nullable(), title: z.string().trim().max(80, "80 حرفاً على الأكثر."), link })
        .refine((it) => Boolean(it.title) || Boolean(it.image), { message: "أدخل عنواناً أو صورة.", path: ["title"] }),
    )
    .min(1, "أضف عنصراً واحداً على الأقل.")
    .max(12, "12 عنصراً على الأكثر."),
});

export const productGridContentSchema = z.object({
  title: z.string().trim().max(80, "80 حرفاً على الأكثر."),
  category_id: z.number({ error: "اختر تصنيفاً." }).int().positive("اختر تصنيفاً."),
  limit,
});

export const heroContentSchema = z.object({
  title: z.string().trim().max(120, "120 حرفاً على الأكثر."),
  subtitle: z.string().trim().max(240, "240 حرفاً على الأكثر."),
  cta_text: z.string().trim().max(40, "40 حرفاً على الأكثر."),
  link,
});

export const listSettingsSchema = z.object({ title: z.string().trim().max(80, "80 حرفاً على الأكثر."), limit: limit.optional() });

export type SectionErrors = Record<string, string>;

/** Local errors for one draft section, keyed like the server (`category_id`, `items.0.title`…). */
export function sectionErrors(section: DraftSection, categoryIds: ReadonlySet<number> | null): SectionErrors {
  const out: SectionErrors = {};
  const collect = (r: { success: boolean; error?: z.ZodError }) => {
    if (r.success || !r.error) return;
    for (const issue of r.error.issues) {
      const key = issue.path.join(".") || "_";
      out[key] ??= issue.message;
    }
  };
  const c = section.content_data;
  const s = section.settings;
  if (section.label.length > 80) out.label = "80 حرفاً على الأكثر.";
  switch (section.section_type) {
    case "slider":
    case "banner_grid":
      collect(itemsContentSchema.safeParse({ items: (c.items as unknown[]) ?? [] }));
      break;
    case "product_grid": {
      collect(productGridContentSchema.safeParse({ title: c.title ?? "", category_id: c.category_id ?? undefined, limit: c.limit ?? 8 }));
      const id = Number(c.category_id);
      if (!out.category_id && categoryIds && id && !categoryIds.has(id)) out.category_id = "تصنيف محذوف — اختر آخر";
      break;
    }
    case "hero":
      collect(heroContentSchema.safeParse({ title: c.title ?? "", subtitle: c.subtitle ?? "", cta_text: c.cta_text ?? "", link: c.link ?? "" }));
      break;
    default:
      collect(listSettingsSchema.safeParse({ title: s.title ?? "", limit: s.limit ?? undefined }));
  }
  return out;
}

export function isDeletedCategory(section: DraftSection, categoryIds: ReadonlySet<number> | null): boolean {
  if (section.section_type !== "product_grid" || !categoryIds) return false;
  const id = Number(section.content_data.category_id);
  return Boolean(id) && !categoryIds.has(id);
}
