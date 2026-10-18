import { z } from "zod";
import {
  sectionTypeSchema,
  storeConfigSchema,
  storeSectionSchema,
  type SectionType,
  type StoreConfig,
  type StoreSection,
} from "@/lib/schemas/store-config";

/**
 * `GET /api/v1/config/` — contract ready-api-v1 #1 (M09 §5, M47).
 *
 * The shape itself lives in `src/lib/schemas/store-config.ts` because the tenant probe
 * (M47) reads it before any storefront module loads; this file is the storefront's import
 * surface plus the per-section readers. Ready fields are required there, every
 * `[NEEDS BACKEND]` extension is optional, and unknown keys pass through.
 */
export const StoreConfigSchema = storeConfigSchema;
export { sectionTypeSchema, storeSectionSchema };
export type { SectionType, StoreConfig, StoreSection };

/** `settings{title, category_id, limit, show_on_mobile}` — every key optional upstream. */
export const sectionSettingsSchema = z.object({
  title: z.string().nullable().optional(),
  category_id: z.coerce.number().int().nullable().optional(),
  limit: z.coerce.number().int().positive().max(50).nullable().optional(),
  show_on_mobile: z.boolean().optional(),
});

/** `content_data.items[]` of `slider` and `banner_grid`. */
export const sectionItemSchema = z.object({
  image: z.string().nullable().optional(),
  title: z.string().nullable().optional().default(""),
  link: z.string().nullable().optional(),
});
export type SectionItem = z.infer<typeof sectionItemSchema>;

/**
 * `content_data` — the documented keys for `product_grid` (`{category_id, limit, title}`)
 * and the slider/banner `items`, plus the hero's own copy (`title`, `subtitle`, `image`,
 * `link`, `cta_text`), which the discovery docs leave unspecified: they are read only if
 * present and the hero falls back to the store name.
 */
export const sectionContentSchema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  cta_text: z.string().nullable().optional(),
  category_id: z.coerce.number().int().nullable().optional(),
  limit: z.coerce.number().int().positive().max(50).nullable().optional(),
  items: z.array(sectionItemSchema).optional().default([]),
});

export interface SectionView {
  id: number;
  type: SectionType;
  label: string;
  title: string | null;
  subtitle: string | null;
  categoryId: number | null;
  limit: number;
  showOnMobile: boolean;
  image: string | null;
  link: string | null;
  ctaText: string | null;
  items: SectionItem[];
}

const DEFAULT_LIMIT = 8;

/**
 * Normalize one section for rendering. `content_data` wins over `settings` for the title
 * (US-09.1.2); a malformed blob never breaks the page — it degrades to defaults.
 */
export function readSection(section: StoreSection): SectionView {
  const settings = sectionSettingsSchema.safeParse(section.settings);
  const content = sectionContentSchema.safeParse(section.content_data);
  const s = settings.success ? settings.data : {};
  const c = content.success ? content.data : { items: [] as SectionItem[] };
  return {
    id: section.id,
    type: section.section_type,
    label: section.label ?? "",
    title: ("title" in c && c.title) || s.title || null,
    subtitle: ("subtitle" in c && c.subtitle) || null,
    categoryId: ("category_id" in c && c.category_id) || s.category_id || null,
    limit: ("limit" in c && c.limit) || s.limit || DEFAULT_LIMIT,
    showOnMobile: s.show_on_mobile ?? true,
    image: ("image" in c && c.image) || null,
    link: ("link" in c && c.link) || null,
    ctaText: ("cta_text" in c && c.cta_text) || null,
    items: c.items ?? [],
  };
}

/**
 * Active sections in the merchant's order (FR-09.02). An empty list falls back to the
 * documented default: latest products, then the category strip (US-09.1.4).
 */
export function orderedSections(config: StoreConfig): SectionView[] {
  const active = config.sections.filter((s) => s.is_active).sort((a, b) => a.order - b.order);
  if (active.length === 0) {
    return [
      readSection({ id: -1, section_type: "latest_products", label: "", order: 0, is_active: true, settings: {}, content_data: {} }),
      readSection({ id: -2, section_type: "category_strip", label: "", order: 1, is_active: true, settings: {}, content_data: {} }),
    ];
  }
  return active.map(readSection);
}
